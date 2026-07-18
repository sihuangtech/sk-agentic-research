"""候选实验代码的有限修复与指标驱动改进。"""

from __future__ import annotations

import json
from pathlib import Path

from backend.domain.models import ValidationReport
from backend.infrastructure.code_policy import PythonCodePolicy
from backend.infrastructure.llm import LlmClient, extract_json
from backend.infrastructure.prompts import PromptRepository


class CandidateImprover:
    def __init__(self, llm: LlmClient, prompts: PromptRepository, policy: PythonCodePolicy):
        self.llm = llm
        self.prompts = prompts
        self.policy = policy

    def improve(
        self,
        source_path: Path,
        report: ValidationReport,
        iteration: int,
        output_path: Path,
    ) -> Path:
        prompt = self.prompts.render(
            "experiment",
            "improve_candidate",
            code=source_path.read_text(encoding="utf-8"),
            report=json.dumps(report.model_dump(mode="json"), ensure_ascii=False, indent=2),
            iteration=iteration,
        )
        payload = extract_json(self.llm.complete(prompt))
        code = payload.get("candidate_code") if isinstance(payload, dict) else None
        if not isinstance(code, str):
            raise ValueError("改进结果缺少 candidate_code")
        violations = self.policy.inspect(code)
        if violations:
            details = "; ".join(f"L{item.line} {item.message}" for item in violations)
            raise ValueError(f"改进代码未通过安全检查: {details}")
        output_path.write_text(code.strip() + "\n", encoding="utf-8")
        return output_path
