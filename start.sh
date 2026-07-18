#!/usr/bin/env bash

set -euo pipefail

PROJECT_PYTHON="${PAPERMILL_PYTHON:-.venv/bin/python}"

if [[ ! -x "$PROJECT_PYTHON" ]]; then
  echo "未找到项目 Python。请先执行 README 中的 python -m venv 和 pip install 命令。" >&2
  exit 1
fi

if [[ ! -d frontend/node_modules ]]; then
  echo "未找到前端依赖。请先在 frontend 目录执行 npm ci。" >&2
  exit 1
fi

(
  cd frontend
  npm run build
)

mkdir -p backend/static
# 静态目录只保留本次构建结果，避免旧哈希资源长期堆积。
find backend/static -mindepth 1 -delete
cp -R frontend/dist/. backend/static/

exec "$PROJECT_PYTHON" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
