"""将假设转换为可执行、可比较、可验证的实验包。"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from backend.core.config import ExperimentSettings
from backend.core.storage import atomic_write_json
from backend.domain.models import Evidence, ExperimentManifest, Hypothesis
from backend.infrastructure.code_policy import PythonCodePolicy
from backend.infrastructure.llm import LlmClient, extract_json_with_retry
from backend.infrastructure.prompts import PromptRepository


@dataclass(frozen=True)
class ExperimentBundle:
    directory: Path
    manifest: ExperimentManifest
    plan_path: Path


class PlanningService:
    def __init__(
        self,
        llm: LlmClient,
        prompts: PromptRepository,
        settings: ExperimentSettings,
        policy: PythonCodePolicy,
    ):
        self.llm = llm
        self.prompts = prompts
        self.settings = settings
        self.policy = policy

    def create_bundle(
        self,
        hypothesis: Hypothesis,
        evidence: list[Evidence],
        output_dir: Path,
    ) -> ExperimentBundle:
        prompt = self.prompts.render(
            "planning",
            "design_experiment",
            hypothesis=hypothesis.model_dump_json(indent=2),
            evidence=json.dumps(
                [item.model_dump(mode="json") for item in evidence if item.id in hypothesis.evidence_ids],
                ensure_ascii=False,
                indent=2,
            ),
            train_seeds=json.dumps(self.settings.train_seeds),
            validation_seeds=json.dumps(self.settings.validation_seeds),
        )
        payload = extract_json_with_retry(self.llm, prompt)
        if not isinstance(payload, dict):
            raise ValueError("实验规划结果必须是 JSON 对象")

        manifest_data = payload.get("manifest", {})
        manifest_data.update(
            {
                "train_seeds": self.settings.train_seeds,
                "validation_seeds": self.settings.validation_seeds,
                "max_iterations": self.settings.max_iterations,
            }
        )
        manifest_data.setdefault("baseline", {}).update(
            {"name": "baseline", "entrypoint": "baseline.py", "kind": "python"}
        )
        manifest_data.setdefault("candidate", {}).update(
            {"name": "candidate", "entrypoint": "candidate.py", "kind": "python"}
        )
        manifest = ExperimentManifest.model_validate(manifest_data)
        baseline = self._validate_code(payload.get("baseline_code"), "基线代码")
        candidate = self._validate_code(payload.get("candidate_code"), "候选代码")

        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "baseline.py").write_text(baseline, encoding="utf-8")
        (output_dir / "candidate.py").write_text(candidate, encoding="utf-8")
        plan_path = output_dir / "plan.md"
        plan_path.write_text(str(payload.get("plan_markdown", "")), encoding="utf-8")
        atomic_write_json(output_dir / "manifest.json", manifest.model_dump(mode="json"))
        return ExperimentBundle(output_dir, manifest, plan_path)

    def _validate_code(self, code: object, label: str) -> str:
        if not isinstance(code, str) or not code.strip():
            raise ValueError(f"{label}为空")
        violations = self.policy.inspect(code)
        if violations:
            details = "; ".join(f"L{item.line} {item.message}" for item in violations)
            raise ValueError(f"{label}未通过安全检查: {details}")
        return code.strip() + "\n"
