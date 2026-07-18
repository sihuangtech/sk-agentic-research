import sys

from backend.infrastructure.process import LocalProcessRunner


def test_running_process_can_be_cancelled(tmp_path) -> None:
    (tmp_path / "sleep.py").write_text("import time\ntime.sleep(30)\n", encoding="utf-8")
    checks = 0

    def is_cancelled() -> bool:
        nonlocal checks
        checks += 1
        return checks >= 3

    result = LocalProcessRunner(60, 512, 64).run(
        [sys.executable, "sleep.py"],
        tmp_path,
        {},
        is_cancelled=is_cancelled,
    )
    assert result.status == "blocked"
    assert result.error == "运行已被用户取消"
