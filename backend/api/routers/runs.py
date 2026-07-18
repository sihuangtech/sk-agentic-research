"""科研运行、审批、恢复与事件接口。"""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from backend.api.dependencies import RuntimeDep
from backend.api.schemas import ApprovalRequest, ResearchRequest

router = APIRouter(tags=["runs"])


@router.post("/research", status_code=202)
def create_research(
    request: ResearchRequest,
    tasks: BackgroundTasks,
    runtime: RuntimeDep,
) -> dict:
    tasks.add_task(runtime.engine.run_direction, request.direction, request.max_ideas)
    return {"message": "研究任务已进入后台", "direction": request.direction}


@router.get("/runs")
@router.get("/pipelines")
def list_runs(runtime: RuntimeDep) -> list[dict]:
    return [item.model_dump(mode="json") for item in runtime.runs.list()]


@router.get("/runs/{run_id}")
@router.get("/pipelines/{run_id}")
def get_run(run_id: str, runtime: RuntimeDep) -> dict:
    run = runtime.runs.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="运行不存在")
    return run.model_dump(mode="json")


@router.get("/runs/{run_id}/events")
def get_events(run_id: str, runtime: RuntimeDep) -> list[dict]:
    if not runtime.runs.get(run_id):
        raise HTTPException(status_code=404, detail="运行不存在")
    return runtime.runs.events(run_id)


@router.post("/runs/{run_id}/approve")
def approve(
    run_id: str,
    request: ApprovalRequest,
    tasks: BackgroundTasks,
    runtime: RuntimeDep,
) -> dict:
    try:
        run = runtime.runs.require(run_id)
        if run.status.value != "waiting_review":
            raise ValueError("只有等待审核的运行可以批准")
        tasks.add_task(runtime.engine.approve, run_id, request.reviewer)
        return {"message": "批准已记录，实验将在后台执行", "id": run_id}
    except (KeyError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.post("/runs/{run_id}/resume")
def resume(
    run_id: str,
    tasks: BackgroundTasks,
    runtime: RuntimeDep,
) -> dict:
    if not runtime.runs.get(run_id):
        raise HTTPException(status_code=404, detail="运行不存在")
    tasks.add_task(runtime.engine.execute, run_id)
    return {"message": "恢复任务已进入后台", "id": run_id}


@router.post("/runs/{run_id}/cancel")
def cancel(run_id: str, runtime: RuntimeDep) -> dict:
    try:
        return runtime.runs.cancel(run_id).model_dump(mode="json")
    except (KeyError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
