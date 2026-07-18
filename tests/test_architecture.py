from pathlib import Path


def test_source_files_stay_below_250_lines() -> None:
    roots = [Path("backend"), Path("frontend/src")]
    suffixes = {".py", ".js", ".jsx", ".ts", ".tsx"}
    oversized = []
    for root in roots:
        for path in root.rglob("*"):
            if path.suffix not in suffixes or "static" in path.parts:
                continue
            lines = len(path.read_text(encoding="utf-8").splitlines())
            if lines > 250:
                oversized.append(f"{path}: {lines}")
    assert oversized == [], "源码文件超过 250 行：\n" + "\n".join(oversized)
