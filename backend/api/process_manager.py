"""管理持续科研调度进程，避免全局裸 Popen 对象散落在路由中。"""

from __future__ import annotations

import os
import subprocess
import threading
from pathlib import Path

import psutil

from backend.infrastructure.process import python_module_command


class OrchestratorProcess:
    def __init__(self, project_dir: Path | None = None):
        self.project_dir = (project_dir or Path.cwd()).resolve()
        self.log_path = self.project_dir / "system.log"
        self._process: subprocess.Popen[str] | None = None
        self._log_handle: object | None = None
        self._lock = threading.RLock()

    @property
    def status(self) -> str:
        return "running" if self._process and self._process.poll() is None else "stopped"

    @property
    def pid(self) -> int | None:
        return self._process.pid if self.status == "running" and self._process else None

    def start(self) -> int:
        with self._lock:
            if self.status == "running":
                return self.pid or 0
            self._log_handle = self.log_path.open("a", encoding="utf-8")
            self._process = subprocess.Popen(
                python_module_command("backend.cli", "daemon", unbuffered=True),
                cwd=self.project_dir,
                stdout=self._log_handle,
                stderr=subprocess.STDOUT,
                text=True,
                start_new_session=os.name != "nt",
            )
            return self._process.pid

    def stop(self) -> None:
        with self._lock:
            if self.status != "running" or not self._process:
                self._close_log()
                return
            process = psutil.Process(self._process.pid)
            children = process.children(recursive=True)
            for child in children:
                child.terminate()
            process.terminate()
            _, alive = psutil.wait_procs([*children, process], timeout=5)
            for item in alive:
                item.kill()
            self._process.wait(timeout=5)
            self._process = None
            self._close_log()

    def restart(self) -> int:
        self.stop()
        return self.start()

    def _close_log(self) -> None:
        if self._log_handle:
            self._log_handle.close()
            self._log_handle = None
