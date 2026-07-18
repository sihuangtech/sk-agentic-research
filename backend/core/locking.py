"""不引入第三方依赖的跨进程文件锁。"""

from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import BinaryIO


@contextmanager
def file_lock(path: Path) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as handle:
        if os.name == "nt":
            _lock_windows(handle)
        else:
            _lock_posix(handle)
        try:
            yield
        finally:
            if os.name == "nt":
                _unlock_windows(handle)
            else:
                _unlock_posix(handle)


def _lock_posix(handle: BinaryIO) -> None:
    import fcntl

    fcntl.flock(handle.fileno(), fcntl.LOCK_EX)


def _unlock_posix(handle: BinaryIO) -> None:
    import fcntl

    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def _lock_windows(handle: BinaryIO) -> None:
    import msvcrt

    if path_size := handle.seek(0, os.SEEK_END):
        handle.seek(0)
    else:
        handle.write(b"0")
        handle.flush()
        handle.seek(0)
    msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, max(path_size, 1))


def _unlock_windows(handle: BinaryIO) -> None:
    import msvcrt

    size = max(handle.seek(0, os.SEEK_END), 1)
    handle.seek(0)
    msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, size)
