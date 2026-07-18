"""假设、论文和可下载产物接口。"""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.api.dependencies import RuntimeDep

router = APIRouter(tags=["artifacts"])


@router.get("/ideas")
def ideas(runtime: RuntimeDep) -> list[dict]:
    output: list[dict] = []
    for path in runtime.workspace.ideas.glob("*.json"):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            review = payload.get("review", {})
            scores = [review.get(key) for key in ("novelty", "feasibility", "falsifiability", "evidence_support")]
            average = sum(scores) / len(scores) if all(isinstance(item, (int, float)) for item in scores) else None
            output.append(
                {
                    "id": payload.get("id", path.stem),
                    "title": payload.get("title", path.stem),
                    "content": payload.get("hypothesis", ""),
                    "score": average,
                    "mtime": path.stat().st_mtime,
                }
            )
        except (OSError, json.JSONDecodeError):
            continue
    return sorted(output, key=lambda item: item["mtime"], reverse=True)


@router.get("/papers")
def papers(runtime: RuntimeDep) -> list[dict]:
    output: list[dict] = []
    for run in runtime.runs.list():
        paper_json = run.artifacts.get("paper_markdown")
        if not paper_json:
            continue
        output.append(
            {
                "id": run.id,
                "title": run.title,
                "abstract": f"验证决策：{run.decision.value if run.decision else 'unknown'}",
                "decision": run.decision,
                "created_at": run.updated_at,
                "has_pdf": "paper_pdf" in run.artifacts,
            }
        )
    return output


@router.get("/papers/{run_id}/{artifact}")
def paper_artifact(
    run_id: str,
    artifact: str,
    runtime: RuntimeDep,
) -> FileResponse:
    aliases = {"pdf": "paper_pdf", "tex": "paper_tex", "md": "paper_markdown"}
    if artifact not in aliases:
        raise HTTPException(status_code=404, detail="产物类型不存在")
    run = runtime.runs.get(run_id)
    path_value = run.artifacts.get(aliases[artifact]) if run else None
    if not path_value or not Path(path_value).is_file():
        raise HTTPException(status_code=404, detail="产物不存在")
    media = {"pdf": "application/pdf", "tex": "text/plain", "md": "text/markdown"}[artifact]
    return FileResponse(path_value, media_type=media, filename=f"{run_id}.{artifact}")
