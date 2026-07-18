"""科研运行仓库：持久化状态、事件与恢复信息。"""

from __future__ import annotations

import json
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from backend.core.locking import file_lock
from backend.core.storage import Workspace, atomic_write_json, read_json
from backend.domain.models import Decision, ResearchRun, RunStage, RunStatus, utc_now


class RunRepository:
    def __init__(self, workspace: Workspace):
        self.workspace = workspace
        self.workspace.ensure()
        self._lock = threading.RLock()

    def create(self, run: ResearchRun) -> ResearchRun:
        with self._lock:
            path = self._state_path(run.id)
            if path.exists():
                raise ValueError(f"运行已存在: {run.id}")
            self.workspace.run_dir(run.id).mkdir(parents=True, exist_ok=False)
            self.save(run)
            self.append_event(run.id, "run.created", {"direction": run.direction})
            return run

    def save(self, run: ResearchRun) -> ResearchRun:
        with self._lock, file_lock(self._lock_path(run.id)):
            run.updated_at = utc_now()
            atomic_write_json(self._state_path(run.id), run.model_dump(mode="json"))
            return run

    def get(self, run_id: str) -> ResearchRun | None:
        data = read_json(self._state_path(run_id))
        return ResearchRun.model_validate(data) if data else None

    def list(self) -> list[ResearchRun]:
        runs: list[ResearchRun] = []
        if not self.workspace.runs.exists():
            return runs
        for path in self.workspace.runs.glob("*/run.json"):
            try:
                runs.append(ResearchRun.model_validate(read_json(path)))
            except (ValueError, json.JSONDecodeError):
                continue
        return sorted(runs, key=lambda item: item.updated_at, reverse=True)

    def start_stage(self, run_id: str, stage: RunStage) -> ResearchRun:
        def mutate(run: ResearchRun) -> None:
            if run.status in {RunStatus.CANCELLED, RunStatus.COMPLETED}:
                raise ValueError(f"终态运行不能进入新阶段: {run.status}")
            run.status = RunStatus.RUNNING
            run.stage = stage
            run.error = None

        run = self._mutate(run_id, mutate)
        self.append_event(run_id, "stage.started", {"stage": stage.value})
        return run

    def finish_stage(self, run_id: str, stage: RunStage, artifacts: dict[str, str] | None = None) -> ResearchRun:
        def mutate(run: ResearchRun) -> None:
            if stage not in run.completed_stages:
                run.completed_stages.append(stage)
            if artifacts:
                run.artifacts.update(artifacts)

        run = self._mutate(run_id, mutate)
        self.append_event(run_id, "stage.completed", {"stage": stage.value, "artifacts": artifacts or {}})
        return run

    def fail(self, run_id: str, error: str) -> ResearchRun:
        def mutate(run: ResearchRun) -> None:
            run.status = RunStatus.FAILED
            run.error = error[:4000]

        run = self._mutate(run_id, mutate)
        self.append_event(run_id, "run.failed", {"error": run.error})
        return run

    def wait_for_review(self, run_id: str) -> ResearchRun:
        run = self._mutate(run_id, lambda item: setattr(item, "status", RunStatus.WAITING_REVIEW))
        self.append_event(run_id, "run.waiting_review", {})
        return run

    def approve(self, run_id: str) -> ResearchRun:
        def mutate(run: ResearchRun) -> None:
            if run.status != RunStatus.WAITING_REVIEW:
                raise ValueError("只有等待审核的运行可以批准")
            run.status = RunStatus.QUEUED

        run = self._mutate(run_id, mutate)
        self.append_event(run_id, "run.approved", {})
        return run

    def complete(self, run_id: str, decision: Decision) -> ResearchRun:
        def mutate(run: ResearchRun) -> None:
            run.status = RunStatus.COMPLETED
            run.stage = RunStage.COMPLETED
            run.decision = decision
            if RunStage.COMPLETED not in run.completed_stages:
                run.completed_stages.append(RunStage.COMPLETED)

        run = self._mutate(run_id, mutate)
        self.append_event(run_id, "run.completed", {"decision": decision.value})
        return run

    def cancel(self, run_id: str) -> ResearchRun:
        def mutate(run: ResearchRun) -> None:
            if run.status == RunStatus.COMPLETED:
                raise ValueError("已完成运行不能取消")
            run.status = RunStatus.CANCELLED

        run = self._mutate(run_id, mutate)
        self.append_event(run_id, "run.cancelled", {})
        return run

    def update_summary(
        self,
        run_id: str,
        decision: Decision,
        metrics: dict[str, float | str | None],
    ) -> ResearchRun:
        def mutate(run: ResearchRun) -> None:
            run.decision = decision
            run.metrics = metrics

        return self._mutate(run_id, mutate)

    def append_event(self, run_id: str, event: str, data: dict[str, Any]) -> None:
        event_path = self.workspace.run_dir(run_id) / "events.jsonl"
        payload = {"time": utc_now(), "event": event, "data": data}
        with (
            self._lock,
            file_lock(event_path.with_suffix(".lock")),
            event_path.open("a", encoding="utf-8") as handle,
        ):
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def events(self, run_id: str, limit: int = 200) -> list[dict[str, Any]]:
        event_path = self.workspace.run_dir(run_id) / "events.jsonl"
        if not event_path.exists():
            return []
        lines = event_path.read_text(encoding="utf-8").splitlines()[-limit:]
        return [json.loads(line) for line in lines if line.strip()]

    def require(self, run_id: str) -> ResearchRun:
        run = self.get(run_id)
        if not run:
            raise KeyError(f"运行不存在: {run_id}")
        return run

    def _state_path(self, run_id: str) -> Path:
        return self.workspace.run_dir(run_id) / "run.json"

    def _lock_path(self, run_id: str) -> Path:
        return self.workspace.run_dir(run_id) / ".state.lock"

    def _mutate(self, run_id: str, callback: Callable[[ResearchRun], None]) -> ResearchRun:
        with self._lock, file_lock(self._lock_path(run_id)):
            data = read_json(self._state_path(run_id))
            if not data:
                raise KeyError(f"运行不存在: {run_id}")
            run = ResearchRun.model_validate(data)
            callback(run)
            run.updated_at = utc_now()
            atomic_write_json(self._state_path(run_id), run.model_dump(mode="json"))
            return run
