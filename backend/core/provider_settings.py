"""本地模型供应商凭据管理；API 永不返回密钥明文。"""

from __future__ import annotations

import os
from collections.abc import MutableMapping
from pathlib import Path
from urllib.parse import urlparse

from dotenv import dotenv_values, set_key, unset_key

PROVIDER_ENV = {
    "openai": {
        "label": "OpenAI / OpenAI 兼容",
        "base_url": "OPENAI_BASE_URL",
        "model_id": "OPENAI_MODEL_ID",
        "api_key": "OPENAI_API_KEY",
        "default_model": "gpt-4o-mini",
    },
    "anthropic": {
        "label": "Anthropic Claude",
        "base_url": "ANTHROPIC_BASE_URL",
        "model_id": "ANTHROPIC_MODEL_ID",
        "api_key": "ANTHROPIC_API_KEY",
        "default_model": "claude-sonnet-4-5",
    },
    "google": {
        "label": "Google Gemini",
        "base_url": "GOOGLE_BASE_URL",
        "model_id": "GOOGLE_MODEL_ID",
        "api_key": "GOOGLE_API_KEY",
        "default_model": "gemini-2.5-flash",
    },
}


class ProviderSettingsStore:
    """将本地密钥保存到被 Git 忽略的 .env，并同步当前进程环境。"""

    def __init__(
        self,
        env_path: str | Path = ".env",
        environ: MutableMapping[str, str] | None = None,
    ):
        self.env_path = Path(env_path)
        self.environ = os.environ if environ is None else environ

    def list_sanitized(self) -> list[dict[str, str | bool]]:
        values = dotenv_values(self.env_path) if self.env_path.exists() else {}
        result = []
        for provider, spec in PROVIDER_ENV.items():
            api_key = self._value(spec["api_key"], values)
            base_url = self._value(spec["base_url"], values)
            model_id = self._value(spec["model_id"], values) or spec["default_model"]
            result.append(
                {
                    "id": provider,
                    "label": spec["label"],
                    "api_key_configured": bool(api_key),
                    "base_url": base_url,
                    "model_id": model_id,
                    "api_mode": self._value("OPENAI_API_MODE", values) or "chat_completions"
                    if provider == "openai"
                    else "",
                }
            )
        return result

    def update(
        self,
        provider: str,
        api_key: str | None,
        base_url: str | None,
        model_id: str | None,
        api_mode: str | None,
    ) -> dict:
        if provider not in PROVIDER_ENV:
            raise ValueError("不支持的模型供应商")
        normalized_url = self._validate_base_url(base_url)
        self._ensure_env_file()
        spec = PROVIDER_ENV[provider]
        self._set_or_unset(spec["base_url"], normalized_url)
        if model_id and model_id.strip():
            self._set(spec["model_id"], model_id.strip())
        if provider == "openai":
            mode = api_mode or "chat_completions"
            if mode not in {"chat_completions", "responses"}:
                raise ValueError("OpenAI 接口模式无效")
            self._set("OPENAI_API_MODE", mode)
        if api_key and api_key.strip():
            self._set(spec["api_key"], api_key.strip())
        return next(item for item in self.list_sanitized() if item["id"] == provider)

    def _value(self, name: str, file_values: dict) -> str:
        return str(self.environ.get(name) or file_values.get(name) or "")

    def _set(self, name: str, value: str) -> None:
        set_key(str(self.env_path), name, value, quote_mode="always")
        self.environ[name] = value

    def _set_or_unset(self, name: str, value: str) -> None:
        if value:
            self._set(name, value)
        else:
            unset_key(str(self.env_path), name)
            self.environ.pop(name, None)

    def _ensure_env_file(self) -> None:
        self.env_path.parent.mkdir(parents=True, exist_ok=True)
        self.env_path.touch(mode=0o600, exist_ok=True)
        self.env_path.chmod(0o600)

    @staticmethod
    def _validate_base_url(value: str | None) -> str:
        normalized = (value or "").strip().rstrip("/")
        if not normalized:
            return ""
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Base URL 必须是有效的 http(s) 地址")
        if parsed.username or parsed.password:
            raise ValueError("Base URL 不得包含用户名或密码")
        return normalized
