"""FastAPI 应用装配。"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.api.routers import artifacts, config, logs, providers, runs, system


def create_app() -> FastAPI:
    app = FastAPI(
        title="Papermill Local Research API",
        version="0.2.0",
        description="可恢复、可验证的本地 AI 科研自动化工作流",
    )
    app.include_router(system.router, prefix="/api/v1")
    app.include_router(config.router, prefix="/api/v1")
    app.include_router(providers.router, prefix="/api/v1")
    app.include_router(logs.router, prefix="/api/v1")
    app.include_router(runs.router, prefix="/api/v1")
    app.include_router(artifacts.router, prefix="/api/v1")

    static_dir = Path("backend/static")
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
    return app
