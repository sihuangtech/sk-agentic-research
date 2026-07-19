"""本地环境诊断，不修改系统环境。"""

from __future__ import annotations

import importlib.util
import os
import shutil
import sys
from typing import Any

from backend.core.config import AppConfig


def diagnose(config: AppConfig) -> dict[str, Any]:
    key_name = f"{config.llm.provider.upper()}_API_KEY"
    return {
        "python": {"ok": sys.version_info >= (3, 10), "version": sys.version.split()[0]},
        "llm_key": {"ok": bool(os.getenv(key_name)), "required": key_name},
        "papermill": {"ok": importlib.util.find_spec("papermill") is not None},
        "pdflatex": {"ok": shutil.which("pdflatex") is not None, "optional": True},
        "workspace": {"ok": True, "path": config.workspace_dir},
        "human_review": {"ok": True, "enabled": config.workflow.human_review_before_execution},
    }
