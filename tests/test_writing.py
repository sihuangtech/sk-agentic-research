import json

from backend.domain.models import (
    Decision,
    Evidence,
    Hypothesis,
    ReviewScore,
    ValidationReport,
)
from backend.infrastructure.llm import FakeLlmClient
from backend.infrastructure.prompts import PromptRepository
from backend.research.writing import WritingService


def test_negative_result_is_labeled_and_citations_are_filtered(tmp_path) -> None:
    response = json.dumps(
        {
            "title": "候选方法研究",
            "abstract": "我们比较了两种方法。",
            "introduction": "研究背景。",
            "methods": "使用相同种子比较。",
            "results": "候选方案没有达到门槛。",
            "limitations": "样本规模有限。",
            "conclusion": "还需要更多实验。",
            "cited_evidence_ids": ["ev-1", "invented"],
        },
        ensure_ascii=False,
    )
    hypothesis = Hypothesis(
        id="hyp-1",
        title="可证伪假设",
        problem="候选方法是否更好？",
        hypothesis="候选方法提高指标。",
        falsification_criteria="提升不足 0.1。",
        independent_variable="方法",
        dependent_variables=["score"],
        baselines=["baseline"],
        expected_outcome="提高 0.1",
        novelty="测试新的候选方法",
        evidence_ids=["ev-1"],
        review=ReviewScore(
            novelty=7,
            feasibility=8,
            falsifiability=9,
            evidence_support=7,
            rationale="可测试",
        ),
    )
    evidence = [Evidence(id="ev-1", source="test", title="Evidence", url="https://example.com")]
    report = ValidationReport(
        decision=Decision.REJECTED,
        metric_name="score",
        direction="maximize",
        baseline_mean=0.5,
        candidate_mean=0.55,
        absolute_delta=0.05,
        success_rate=1.0,
        reasons=["未达到 0.1 门槛"],
    )
    WritingService(FakeLlmClient([response]), PromptRepository()).write(
        hypothesis,
        evidence,
        report,
        tmp_path,
    )
    draft = json.loads((tmp_path / "paper.json").read_text(encoding="utf-8"))
    assert draft["title"].startswith("[假设未达到预设改进门槛]")
    assert draft["cited_evidence_ids"] == ["ev-1"]
