"""FastAPI 应用装配。"""

import os
import secrets
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from backend.api.routers import artifacts, config, logs, providers, runs, system


class DesktopTokenMiddleware(BaseHTTPMiddleware):
    """桌面 sidecar 仅接受由 Tauri 主进程生成的一次性令牌。"""

    async def dispatch(self, request: Request, call_next):
        expected = os.getenv("PAPERMILL_DESKTOP_TOKEN")
        if not expected or request.method == "OPTIONS" or not request.url.path.startswith("/api/v1"):
            return await call_next(request)
        supplied = request.headers.get("X-Papermill-Token") or request.query_params.get("token")
        if not supplied or not secrets.compare_digest(supplied, expected):
            return JSONResponse(status_code=401, content={"detail": "桌面端访问令牌无效"})
        return await call_next(request)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Papermill Local Research API",
        version="0.2.0",
        description="可恢复、可验证的本地 AI 科研自动化工作流",
    )
    app.add_middleware(DesktopTokenMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "tauri://localhost",
            "http://tauri.localhost",
            "https://tauri.localhost",
            "http://localhost:5173",
        ],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
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
