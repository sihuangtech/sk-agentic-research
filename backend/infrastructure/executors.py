"""Python 脚本与 Jupyter Notebook 的统一实验执行接口。"""

from __future__ import annotations

import json
import shutil
import sys
from collections.abc import Callable
from pathlib import Path

import nbformat
import yaml

from backend.domain.models import ExperimentArm, TrialResult
from backend.infrastructure.code_policy import PythonCodePolicy
from backend.infrastructure.process import LocalProcessRunner, python_command, python_module_command


class ExperimentExecutor:
    def __init__(self, runner: LocalProcessRunner, policy: PythonCodePolicy):
        self.runner = runner
        self.policy = policy

    def execute(
        self,
        arm: ExperimentArm,
        bundle_dir: Path,
        trial_dir: Path,
        seed: int,
        phase: str,
        is_cancelled: Callable[[], bool] | None = None,
    ) -> TrialResult:
        trial_dir.mkdir(parents=True, exist_ok=True)
        source_path = bundle_dir / arm.entrypoint
        if not source_path.is_file():
            return self._blocked(arm, seed, phase, f"实验入口不存在: {arm.entrypoint}")

        if arm.kind == "python":
            command = self._prepare_python(source_path, trial_dir)
        else:
            command = self._prepare_notebook(source_path, trial_dir, arm, seed)
        if isinstance(command, str):
            return self._blocked(arm, seed, phase, command)

        output_path = trial_dir / "results.json"
        env = {
            "PAPERMILL_SEED": str(seed),
            "PAPERMILL_PHASE": phase,
            "PAPERMILL_OUTPUT": str(output_path),
            "PAPERMILL_PARAMETERS": json.dumps(arm.parameters, ensure_ascii=False),
            "PYTHONHASHSEED": str(seed),
        }
        result = self.runner.run(command, trial_dir, env, is_cancelled=is_cancelled)
        return TrialResult(
            arm=arm.name,
            seed=seed,
            phase=phase,
            status=result.status,
            duration_seconds=result.duration_seconds,
            exit_code=result.exit_code,
            output_path=str(output_path) if output_path.exists() else None,
            stdout_path=str(result.stdout_path),
            stderr_path=str(result.stderr_path),
            error=result.error,
        )

    def _prepare_python(self, source: Path, trial_dir: Path) -> list[str] | str:
        code = source.read_text(encoding="utf-8")
        violations = self.policy.inspect(code)
        if violations:
            return "; ".join(f"L{item.line} {item.message}" for item in violations)
        target = trial_dir / "experiment.py"
        shutil.copy2(source, target)
        return python_command(target.name)

    def _prepare_notebook(
        self,
        source: Path,
        trial_dir: Path,
        arm: ExperimentArm,
        seed: int,
    ) -> list[str] | str:
        notebook = nbformat.read(source, as_version=4)
        code = "\n".join(cell.source for cell in notebook.cells if cell.cell_type == "code")
        violations = self.policy.inspect(code)
        if violations:
            return "; ".join(f"L{item.line} {item.message}" for item in violations)
        input_path = trial_dir / "input.ipynb"
        output_path = trial_dir / "executed.ipynb"
        params_path = trial_dir / "parameters.yaml"
        shutil.copy2(source, input_path)
        parameters = {**arm.parameters, "seed": seed, "results_path": str(trial_dir / "results.json")}
        params_path.write_text(yaml.safe_dump(parameters, allow_unicode=True), encoding="utf-8")
        kernel_name = notebook.metadata.get("kernelspec", {}).get("name", "python3")
        if getattr(sys, "frozen", False):
            kernel_name = "papermill-desktop"
        language = notebook.metadata.get("language_info", {}).get("name", "python")
        return python_module_command(
            "papermill",
            input_path.name,
            output_path.name,
            "--parameters_file",
            params_path.name,
            "--kernel",
            kernel_name,
            "--language",
            language,
        )

    @staticmethod
    def _blocked(arm: ExperimentArm, seed: int, phase: str, error: str) -> TrialResult:
        return TrialResult(
            arm=arm.name,
            seed=seed,
            phase=phase,
            status="blocked",
            error=error,
        )
