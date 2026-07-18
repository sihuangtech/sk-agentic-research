"""多模型调用适配器；上层 Agent 只依赖 LlmClient 协议。"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Protocol

from anthropic import Anthropic
from openai import OpenAI


class LlmClient(Protocol):
    def complete(self, prompt: str, max_tokens: int = 6000) -> str:
        """返回模型生成的纯文本。"""


class ProviderLlmClient:
    """根据模型名前缀选择官方 SDK。"""

    def __init__(self, model: str, default_max_tokens: int = 6000, provider: str | None = None):
        self.model = model
        self.default_max_tokens = default_max_tokens
        self.provider = provider or self._infer_provider(model)

    def complete(self, prompt: str, max_tokens: int = 6000) -> str:
        max_tokens = min(max_tokens, self.default_max_tokens)
        if self.provider == "anthropic":
            return self._anthropic(prompt, max_tokens)
        if self.provider == "google":
            return self._gemini(prompt, max_tokens)
        return self._openai(prompt, max_tokens)

    @staticmethod
    def _infer_provider(model: str) -> str:
        if model.startswith("claude"):
            return "anthropic"
        if model.startswith("gemini"):
            return "google"
        return "openai"

    def _openai(self, prompt: str, max_tokens: int) -> str:
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("缺少 OPENAI_API_KEY")
        client = OpenAI(api_key=key, base_url=os.getenv("OPENAI_BASE_URL") or None)
        if os.getenv("OPENAI_API_MODE", "responses") == "responses":
            response = client.responses.create(
                model=self.model,
                input=prompt,
                max_output_tokens=max_tokens,
            )
            return response.output_text or ""
        response = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.2,
        )
        return response.choices[0].message.content or ""

    def _anthropic(self, prompt: str, max_tokens: int) -> str:
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("缺少 ANTHROPIC_API_KEY")
        response = Anthropic(
            api_key=key,
            base_url=os.getenv("ANTHROPIC_BASE_URL") or None,
        ).messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(block.text for block in response.content if hasattr(block, "text"))

    def _gemini(self, prompt: str, max_tokens: int) -> str:
        key = os.getenv("GOOGLE_API_KEY")
        if not key:
            raise RuntimeError("缺少 GOOGLE_API_KEY")
        from google import genai
        from google.genai import types

        base_url = os.getenv("GOOGLE_BASE_URL")
        http_options = types.HttpOptions(base_url=base_url) if base_url else None
        with genai.Client(api_key=key, http_options=http_options) as client:
            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.2,
                ),
            )
        return response.text or ""


def extract_json(text: str) -> Any:
    """从模型回复中提取 JSON，拒绝用 eval 解析。"""
    stripped = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", stripped, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        stripped = fenced.group(1).strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        starts = [index for index in (stripped.find("{"), stripped.find("[")) if index >= 0]
        if not starts:
            raise ValueError("模型回复中没有 JSON") from None
        decoder = json.JSONDecoder()
        payload, _ = decoder.raw_decode(stripped[min(starts) :])
        return payload


class FakeLlmClient:
    """测试使用的确定性模型，不发起网络请求。"""

    def __init__(self, responses: list[str]):
        self.responses = list(responses)
        self.prompts: list[str] = []

    def complete(self, prompt: str, max_tokens: int = 6000) -> str:
        self.prompts.append(prompt)
        if not self.responses:
            raise RuntimeError("FakeLlmClient 没有剩余回复")
        return self.responses.pop(0)
