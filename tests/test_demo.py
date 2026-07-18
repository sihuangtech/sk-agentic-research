from backend.core.storage import Workspace
from backend.demo import run_demo


def test_offline_demo_runs_real_processes(tmp_path) -> None:
    run = run_demo(Workspace(tmp_path))
    assert run.status.value == "completed"
    assert run.decision.value == "accepted"
    assert run.metrics["improvement"] > 0.1
    assert len(list((tmp_path / "runs" / run.id / "trials").glob("**/results.json"))) == 12
