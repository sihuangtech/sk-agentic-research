"""日志和运行状态的 SSE 推送接口。"""

from __future__ import annotations

import asyncio
import json
from collections import deque
from pathlib import Path

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from backend.api.dependencies import RuntimeDep

router = APIRouter(tags=["events"])
LOG_PATH = Path("system.log")


@router.get("/logs")
def logs(lines: int = 100) -> dict:
    if not LOG_PATH.exists():
        return {"logs": ""}
    with LOG_PATH.open("r", encoding="utf-8", errors="replace") as handle:
        content = "".join(deque(handle, maxlen=min(max(lines, 1), 5000)))
    return {"logs": content}


@router.get("/logs/stream")
def stream_logs() -> EventSourceResponse:
    async def generate():
        position = LOG_PATH.stat().st_size if LOG_PATH.exists() else 0
        while True:
            if LOG_PATH.exists():
                with LOG_PATH.open("r", encoding="utf-8", errors="replace") as handle:
                    handle.seek(position)
                    for line in handle:
                        yield {"data": line.rstrip("\n")}
                    position = handle.tell()
            await asyncio.sleep(0.5)

    return EventSourceResponse(generate())


@router.get("/pipelines/stream")
def stream_runs(runtime: RuntimeDep) -> EventSourceResponse:
    async def generate():
        last_state = ""
        while True:
            payload = [item.model_dump(mode="json") for item in runtime.runs.list()]
            state = json.dumps(payload, ensure_ascii=False, sort_keys=True)
            if state != last_state:
                yield {"data": state}
                last_state = state
            await asyncio.sleep(2)

    return EventSourceResponse(generate())
