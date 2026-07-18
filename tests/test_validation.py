import pytest

from backend.domain.models import MetricSpec, TrialResult
from backend.research.validation import ResultValidator


def trial(arm: str, seed: int, value: float) -> TrialResult:
    return TrialResult(
        arm=arm,
        seed=seed,
        phase="validation",
        status="succeeded",
        metric=value,
    )


def test_accepts_stable_held_out_improvement() -> None:
    trials = [trial("baseline", seed, 0.5) for seed in (1, 2, 3)]
    trials += [trial("candidate", seed, value) for seed, value in zip((1, 2, 3), (0.65, 0.66, 0.64), strict=True)]
    report = ResultValidator(1.0, 0.15).validate(
        MetricSpec(name="score", json_path="metrics.score", direction="maximize", minimum_delta=0.1),
        [],
        trials,
    )
    assert report.decision.value == "accepted"
    assert report.absolute_delta == pytest.approx(0.15)


def test_marks_unstable_candidate_inconclusive() -> None:
    trials = [trial("baseline", seed, 1.0) for seed in (1, 2, 3)]
    trials += [trial("candidate", seed, value) for seed, value in zip((1, 2, 3), (0.5, 1.5, 2.5), strict=True)]
    report = ResultValidator(1.0, 0.1).validate(
        MetricSpec(name="score", json_path="score", direction="maximize"),
        [],
        trials,
    )
    assert report.decision.value == "inconclusive"
