"""集中读取提示词，避免业务逻辑散落字符串模板。"""

from pathlib import Path
from typing import Any

import yaml


class PromptRepository:
    def __init__(self, path: str | Path = "prompts.yaml"):
        self.path = Path(path)
        with self.path.open("r", encoding="utf-8") as handle:
            self._prompts = yaml.safe_load(handle) or {}

    def render(self, section: str, name: str, **values: Any) -> str:
        try:
            template = self._prompts[section][name]
        except KeyError as error:
            raise KeyError(f"提示词不存在: {section}.{name}") from error
        return template.format(**values)
