"""基线、候选迭代和留出验证的实验编排。"""

from __future__ import annotations

import importlib.util
import logging
from collections.abc import Callable
from pathlib import Path

from backend.core.storage import atomic_write_json
from backend.domain.models import ExperimentArm, ExperimentManifest, TrialResult, ValidationReport
from backend.infrastructure.executors import ExperimentExecutor
from backend.research.improvement import CandidateImprover
from backend.research.validation import ResultValidator, attach_metrics


class ResearchCancelled(RuntimeError):
    """用户主动取消科研运行。"""


class ExperimentService:
    def __init__(
        self,
        executor: ExperimentExecutor,
        validator: ResultValidator,
        improver: CandidateImprover | None = None,
    ):
        self.executor = executor
        self.validator = validator
        self.improver = improver
        self.logger = logging.getLogger(__name__)

    def run(
        self,
        manifest: ExperimentManifest,
        bundle_dir: Path,
        run_dir: Path,
        on_stage: Callable[[str], None] | None = None,
        is_cancelled: Callable[[], bool] | None = None,
    ) -> ValidationReport:
        missing = [name for name in manifest.required_modules if importlib.util.find_spec(name) is None]
        if missing:
            raise RuntimeError(f"实验缺少已审核依赖模块: {', '.join(missing)}")
        trials_dir = run_dir / "trials"
        if on_stage:
            on_stage("baseline")
        train_baseline = self._run_arm(
            manifest.baseline,
            manifest.train_seeds,
            "train",
            bundle_dir,
            trials_dir / "train" / "baseline",
            is_cancelled,
        )
        attach_metrics(train_baseline, manifest.metric)

        candidate = manifest.candidate.model_copy(deep=True)
        selected_trials: list[TrialResult] = []
        selected_score: float | None = None
        if on_stage:
            on_stage("experiment")
        for iteration in range(1, manifest.max_iterations + 1):
            iteration_trials = self._run_arm(
                candidate,
                manifest.train_seeds,
                "train",
                bundle_dir,
                trials_dir / "train" / f"candidate-{iteration}",
                is_cancelled,
            )
            attach_metrics(iteration_trials, manifest.metric)
            preliminary = self.validator.validate(
                manifest.metric,
                [],
                train_baseline + iteration_trials,
            )
            score = self._selection_score(preliminary)
            if selected_score is None or score > selected_score:
                selected_score = score
                selected_trials = iteration_trials
                manifest.candidate = candidate.model_copy(deep=True)
            if preliminary.decision.value == "accepted" or not self.improver:
                break
            if iteration < manifest.max_iterations:
                next_name = f"candidate_v{iteration + 1}.py"
                try:
                    self.improver.improve(
                        bundle_dir / candidate.entrypoint,
                        preliminary,
                        iteration + 1,
                        bundle_dir / next_name,
                    )
                    candidate.entrypoint = next_name
                except (OSError, RuntimeError, ValueError) as error:
                    self.logger.warning("候选改进失败，使用当前最佳方案进入留出验证: %s", error)
                    break

        atomic_write_json(bundle_dir / "manifest.json", manifest.model_dump(mode="json"))
        if on_stage:
            on_stage("validation")
        validation_trials = self._run_arm(
            manifest.baseline,
            manifest.validation_seeds,
            "validation",
            bundle_dir,
            trials_dir / "validation" / "baseline",
            is_cancelled,
        ) + self._run_arm(
            manifest.candidate,
            manifest.validation_seeds,
            "validation",
            bundle_dir,
            trials_dir / "validation" / "candidate",
            is_cancelled,
        )
        attach_metrics(validation_trials, manifest.metric)
        report = self.validator.validate(
            manifest.metric,
            train_baseline + selected_trials,
            validation_trials,
        )
        atomic_write_json(run_dir / "validation.json", report.model_dump(mode="json"))
        return report

    def _run_arm(
        self,
        arm: ExperimentArm,
        seeds: list[int],
        phase: str,
        bundle_dir: Path,
        output_dir: Path,
        is_cancelled: Callable[[], bool] | None,
    ) -> list[TrialResult]:
        results: list[TrialResult] = []
        for seed in seeds:
            if is_cancelled and is_cancelled():
                raise ResearchCancelled("运行已被用户取消")
            result = self.executor.execute(
                arm,
                bundle_dir,
                output_dir / f"seed-{seed}",
                seed,
                phase,
                is_cancelled,
            )
            if result.status == "blocked" and result.error == "运行已被用户取消":
                raise ResearchCancelled(result.error)
            results.append(result)
        return results

    @staticmethod
    def _selection_score(report: ValidationReport) -> float:
        if report.candidate_mean is None:
            return float("-inf")
        value = report.candidate_mean
        return value if report.direction == "maximize" else -value
