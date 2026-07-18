"""依据证据生成可证伪假设，并用多维量表而非单一分数筛选。"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from backend.core.storage import atomic_write_json, safe_identifier
from backend.domain.models import Evidence, Hypothesis, ReviewScore
from backend.infrastructure.llm import LlmClient, extract_json
from backend.infrastructure.prompts import PromptRepository


class HypothesisService:
    def __init__(
        self,
        generator: LlmClient,
        reviewer: LlmClient,
        prompts: PromptRepository,
        threshold: float,
    ):
        self.generator = generator
        self.reviewer = reviewer
        self.prompts = prompts
        self.threshold = threshold
        self.logger = logging.getLogger(__name__)

    def generate(
        self,
        direction: str,
        evidence: list[Evidence],
        max_ideas: int,
        output_dir: Path,
    ) -> list[Hypothesis]:
        context = json.dumps(
            [item.model_dump(mode="json") for item in evidence],
            ensure_ascii=False,
            indent=2,
        )
        prompt = self.prompts.render(
            "ideation",
            "generate_hypotheses",
            direction=direction,
            max_ideas=max_ideas,
            evidence=context,
        )
        raw_ideas = extract_json(self.generator.complete(prompt))
        if not isinstance(raw_ideas, list):
            raise ValueError("假设生成结果必须是 JSON 数组")

        allowed_ids = {item.id for item in evidence}
        accepted: list[Hypothesis] = []
        for raw in raw_ideas[:max_ideas]:
            try:
                if not isinstance(raw, dict):
                    raise ValueError("假设条目不是 JSON 对象")
                evidence_ids = [item for item in raw.get("evidence_ids", []) if item in allowed_ids]
                if not evidence_ids:
                    raise ValueError("假设没有绑定有效证据")
                raw["evidence_ids"] = evidence_ids
                review = self._review(raw, evidence_ids)
                if review.average < self.threshold or min(
                    review.feasibility,
                    review.falsifiability,
                    review.evidence_support,
                ) < 5:
                    continue
                hypothesis_id = self._identifier(raw.get("title", "hypothesis"), raw.get("hypothesis", ""))
                hypothesis = Hypothesis.model_validate(
                    {**raw, "id": hypothesis_id, "review": review.model_dump()}
                )
                self._save(hypothesis, evidence, output_dir)
                accepted.append(hypothesis)
            except (KeyError, TypeError, ValueError) as error:
                self.logger.warning("跳过无效假设: %s", error)
        return accepted

    def _review(self, idea: dict, evidence_ids: list[str]) -> ReviewScore:
        prompt = self.prompts.render(
            "ideation",
            "review_hypothesis",
            hypothesis=json.dumps(idea, ensure_ascii=False, indent=2),
            evidence_ids=json.dumps(evidence_ids, ensure_ascii=False),
        )
        return ReviewScore.model_validate(extract_json(self.reviewer.complete(prompt, max_tokens=1200)))

    @staticmethod
    def _identifier(title: str, hypothesis: str) -> str:
        digest = hashlib.sha256(hypothesis.encode()).hexdigest()[:8]
        return f"{safe_identifier(title)[:60]}-{digest}"

    @staticmethod
    def _save(hypothesis: Hypothesis, evidence: list[Evidence], output_dir: Path) -> None:
        output_dir.mkdir(parents=True, exist_ok=True)
        json_path = output_dir / f"{hypothesis.id}.json"
        markdown_path = output_dir / f"{hypothesis.id}.md"
        atomic_write_json(json_path, hypothesis.model_dump(mode="json"))
        evidence_map = {item.id: item for item in evidence}
        references = "\n".join(
            f"- [{item_id}]({evidence_map[item_id].url}) {evidence_map[item_id].title}"
            for item_id in hypothesis.evidence_ids
            if item_id in evidence_map
        )
        markdown_path.write_text(
            f"""# {hypothesis.title}

## 研究问题
{hypothesis.problem}

## 可证伪假设
{hypothesis.hypothesis}

## 证伪条件
{hypothesis.falsification_criteria}

## 变量与基线
- 自变量：{hypothesis.independent_variable}
- 因变量：{', '.join(hypothesis.dependent_variables)}
- 基线：{', '.join(hypothesis.baselines)}

## 证据
{references or '- 暂无可绑定证据'}

## 评审
- 综合分：{hypothesis.review.average}
- 理由：{hypothesis.review.rationale}
""",
            encoding="utf-8",
        )
