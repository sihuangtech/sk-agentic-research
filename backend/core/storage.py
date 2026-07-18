"""工作区文件布局与原子读写。"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any


def safe_identifier(value: str) -> str:
    """将外部标识转换为不会逃逸工作区的文件名。"""
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip()).strip("-").lower()
    if not cleaned:
        raise ValueError("标识不能为空")
    return cleaned[:96]


def atomic_write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False),
        encoding="utf-8",
    )
    os.replace(temp_path, path)


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


class Workspace:
    """统一管理所有运行产物的位置。"""

    def __init__(self, root: str | Path):
        self.root = Path(root).resolve()
        self.ideas = self.root / "ideas"
        self.evidence = self.root / "evidence"
        self.runs = self.root / "runs"
        self.results = self.root / "results"
        self.papers = self.root / "papers"
        self.cache = self.root / "cache"

    def ensure(self) -> None:
        for directory in (
            self.ideas,
            self.evidence,
            self.runs,
            self.results,
            self.papers,
            self.cache,
        ):
            directory.mkdir(parents=True, exist_ok=True)

    def run_dir(self, run_id: str) -> Path:
        return self.runs / safe_identifier(run_id)

    def resolve_inside(self, base: Path, relative: str) -> Path:
        """解析运行产物路径，并阻止目录穿越。"""
        candidate = (base / relative).resolve()
        if candidate != base.resolve() and base.resolve() not in candidate.parents:
            raise ValueError("路径超出允许的工作目录")
        return candidate
