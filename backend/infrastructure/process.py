"""有超时、资源限制和日志留存的本地进程执行器。"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from collections.abc import Callable
from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path

import psutil


@dataclass(frozen=True)
class ProcessResult:
    status: str
    exit_code: int | None
    duration_seconds: float
    stdout_path: Path
    stderr_path: Path
    error: str | None = None


class LocalProcessRunner:
    def __init__(self, timeout_seconds: int, max_memory_mb: int, max_output_kb: int):
        self.timeout_seconds = timeout_seconds
        self.max_memory_mb = max_memory_mb
        self.max_output_bytes = max_output_kb * 1024

    def run(
        self,
        command: list[str],
        cwd: Path,
        extra_env: dict[str, str],
        is_cancelled: Callable[[], bool] | None = None,
    ) -> ProcessResult:
        """不经过 shell 执行命令，并从环境中剔除 API 密钥。"""
        stdout_path = cwd / "stdout.log"
        stderr_path = cwd / "stderr.log"
        env = self._sanitized_env(extra_env)
        started = time.monotonic()
        with stdout_path.open("w", encoding="utf-8") as stdout, stderr_path.open(
            "w", encoding="utf-8"
        ) as stderr:
            process = subprocess.Popen(
                command,
                cwd=cwd,
                env=env,
                stdout=stdout,
                stderr=stderr,
                text=True,
                start_new_session=os.name != "nt",
                preexec_fn=self._limit_resources if sys.platform.startswith("linux") else None,
            )
            status, exit_code, error = self._monitor(process, started, is_cancelled)

        self._truncate(stdout_path)
        self._truncate(stderr_path)
        return ProcessResult(
            status=status,
            exit_code=exit_code,
            duration_seconds=round(time.monotonic() - started, 3),
            stdout_path=stdout_path,
            stderr_path=stderr_path,
            error=error,
        )

    def _sanitized_env(self, extra: dict[str, str]) -> dict[str, str]:
        allowed = (
            "PATH",
            "LANG",
            "LC_ALL",
            "VIRTUAL_ENV",
            "SYSTEMROOT",
            "TMPDIR",
            "JUPYTER_PATH",
            "MPLBACKEND",
            "MPLCONFIGDIR",
        )
        env = {key: os.environ[key] for key in allowed if key in os.environ}
        env.update(extra)
        env["PYTHONUNBUFFERED"] = "1"
        return env

    def _limit_resources(self) -> None:
        import resource

        memory = self.max_memory_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
        cpu_seconds = max(1, self.timeout_seconds)
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))

    def _monitor(
        self,
        process: subprocess.Popen[str],
        started: float,
        is_cancelled: Callable[[], bool] | None,
    ) -> tuple[str, int | None, str | None]:
        tracked = psutil.Process(process.pid)
        memory_limit = self.max_memory_mb * 1024 * 1024
        while process.poll() is None:
            if is_cancelled and is_cancelled():
                self._terminate(process)
                return "blocked", None, "运行已被用户取消"
            if time.monotonic() - started > self.timeout_seconds:
                self._terminate(process)
                return "timeout", None, f"执行超过 {self.timeout_seconds} 秒"
            try:
                processes = [tracked, *tracked.children(recursive=True)]
                memory = sum(item.memory_info().rss for item in processes if item.is_running())
                if memory > memory_limit:
                    self._terminate(process)
                    return "blocked", None, f"内存使用超过 {self.max_memory_mb} MB"
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
            time.sleep(0.1)
        exit_code = process.returncode
        if exit_code == 0:
            return "succeeded", exit_code, None
        return "failed", exit_code, f"进程退出码为 {exit_code}"

    @staticmethod
    def _terminate(process: subprocess.Popen[str]) -> None:
        if os.name == "nt":
            process.kill()
            return
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=3)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            with suppress(ProcessLookupError):
                os.killpg(process.pid, signal.SIGKILL)

    def _truncate(self, path: Path) -> None:
        if path.stat().st_size <= self.max_output_bytes:
            return
        with path.open("rb") as handle:
            handle.seek(-self.max_output_bytes, os.SEEK_END)
            tail = handle.read()
        path.write_bytes(b"[output truncated]\n" + tail)


def python_command(script_name: str) -> list[str]:
    """返回可同时用于源码环境和 PyInstaller 桌面 sidecar 的 Python 命令。"""
    if getattr(sys, "frozen", False):
        return [sys.executable, "__run_python__", script_name]
    return [sys.executable, "-I", script_name]


def python_module_command(
    module: str,
    *args: str,
    isolated: bool = False,
    unbuffered: bool = False,
) -> list[str]:
    """运行 Python 模块；冻结后复用 sidecar 内嵌解释器。"""
    if getattr(sys, "frozen", False):
        return [sys.executable, "__run_module__", module, *args]
    flags = []
    if isolated:
        flags.append("-I")
    if unbuffered:
        flags.append("-u")
    return [sys.executable, *flags, "-m", module, *args]
