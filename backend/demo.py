"""无需网络和 API Key 的真实实验烟雾测试。"""

from __future__ import annotations

import uuid

from backend.core.runs import RunRepository
from backend.core.storage import Workspace, atomic_write_json
from backend.domain.models import (
    ExperimentArm,
    ExperimentManifest,
    MetricSpec,
    ResearchRun,
    RunStage,
)
from backend.infrastructure.code_policy import PythonCodePolicy
from backend.infrastructure.executors import ExperimentExecutor
from backend.infrastructure.process import LocalProcessRunner
from backend.research.experiments import ExperimentService
from backend.research.validation import ResultValidator

BASELINE_CODE = '''import json
import os
import random

seed = int(os.environ["PAPERMILL_SEED"])
output = os.environ["PAPERMILL_OUTPUT"]
score = 0.50 + random.Random(seed).uniform(-0.01, 0.01)
with open(output, "w", encoding="utf-8") as handle:
    json.dump({"metrics": {"score": score}}, handle)
'''

CANDIDATE_CODE = '''import json
import os
import random

seed = int(os.environ["PAPERMILL_SEED"])
output = os.environ["PAPERMILL_OUTPUT"]
score = 0.66 + random.Random(seed).uniform(-0.01, 0.01)
with open(output, "w", encoding="utf-8") as handle:
    json.dump({"metrics": {"score": score}}, handle)
'''


def run_demo(workspace: Workspace) -> ResearchRun:
    """执行 12 次真实子进程并走完留出验证门禁。"""
    runs = RunRepository(workspace)
    run_id = f"demo-{uuid.uuid4().hex[:8]}"
    run = runs.create(ResearchRun(id=run_id, title="离线验证演示", direction="demo"))
    run_dir = workspace.run_dir(run_id)
    bundle_dir = run_dir / "experiment"
    bundle_dir.mkdir(parents=True)
    (bundle_dir / "baseline.py").write_text(BASELINE_CODE, encoding="utf-8")
    (bundle_dir / "candidate.py").write_text(CANDIDATE_CODE, encoding="utf-8")
    manifest = ExperimentManifest(
        objective="验证候选方案是否稳定优于基线",
        metric=MetricSpec(
            name="score",
            json_path="metrics.score",
            direction="maximize",
            minimum_delta=0.10,
        ),
        baseline=ExperimentArm(name="baseline", entrypoint="baseline.py"),
        candidate=ExperimentArm(name="candidate", entrypoint="candidate.py"),
        train_seeds=[11, 23, 37],
        validation_seeds=[101, 211, 307],
        max_iterations=1,
    )
    atomic_write_json(bundle_dir / "manifest.json", manifest.model_dump(mode="json"))
    service = ExperimentService(
        ExperimentExecutor(
            LocalProcessRunner(timeout_seconds=30, max_memory_mb=512, max_output_kb=128),
            PythonCodePolicy(blocked_modules=["subprocess", "socket", "requests", "urllib"]),
        ),
        ResultValidator(minimum_success_rate=1.0, maximum_cv=0.15),
    )

    current: list[RunStage | None] = [None]

    def on_stage(name: str) -> None:
        stage = RunStage(name)
        if current[0]:
            runs.finish_stage(run_id, current[0])
        runs.start_stage(run_id, stage)
        current[0] = stage

    report = service.run(manifest, bundle_dir, run_dir, on_stage=on_stage)
    runs.finish_stage(run_id, RunStage.VALIDATION, {"validation": str(run_dir / "validation.json")})
    run = runs.require(run_id)
    run.metrics = {
        "baseline_mean": report.baseline_mean,
        "candidate_mean": report.candidate_mean,
        "improvement": report.absolute_delta,
    }
    runs.save(run)
    return runs.complete(run_id, report.decision)
