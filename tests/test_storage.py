from backend.core.runs import RunRepository
from backend.core.storage import Workspace
from backend.domain.models import ResearchRun, RunStage


def test_run_state_and_events_are_persisted(tmp_path) -> None:
    repository = RunRepository(Workspace(tmp_path))
    repository.create(ResearchRun(id="run-1", title="Test", direction="test"))
    repository.start_stage("run-1", RunStage.PLANNING)
    repository.finish_stage("run-1", RunStage.PLANNING, {"plan": "plan.md"})

    restored = repository.require("run-1")
    assert RunStage.PLANNING in restored.completed_stages
    assert restored.artifacts["plan"] == "plan.md"
    assert [event["event"] for event in repository.events("run-1")] == [
        "run.created",
        "stage.started",
        "stage.completed",
    ]
