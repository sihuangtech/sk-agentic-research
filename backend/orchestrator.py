"""持续科研调度兼容入口；推荐使用 ``python -m backend.cli daemon``。"""

from backend.cli import configure_logging
from backend.workflow.factory import build_runtime


def start() -> None:
    configure_logging()
    runtime = build_runtime()
    from backend.cli import _daemon

    _daemon(runtime)


if __name__ == "__main__":
    start()
