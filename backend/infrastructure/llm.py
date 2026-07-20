"""多模型调用适配器；上层 Agent 只依赖 LlmClient 协议。"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Protocol

from anthropic import Anthropic
from openai import OpenAI

logger = logging.getLogger(__name__)


class LlmClient(Protocol):
    def complete(self, prompt: str, max_tokens: int = 6000) -> str:
        """返回模型生成的纯文本。"""


class ProviderLlmClient:
    """根据模型名前缀选择官方 SDK。"""

    def __init__(self, model: str, default_max_tokens: int, provider: str):
        self.model = model
        self.default_max_tokens = default_max_tokens
        self.provider = provider

    def complete(self, prompt: str, max_tokens: int = 6000) -> str:
        max_tokens = min(max_tokens, self.default_max_tokens)
        if self.provider == "anthropic":
            return self._anthropic(prompt, max_tokens)
        if self.provider == "google":
            return self._gemini(prompt, max_tokens)
        return self._openai(prompt, max_tokens)

    def _openai(self, prompt: str, max_tokens: int) -> str:
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("缺少 OPENAI_API_KEY")
        client = OpenAI(api_key=key, base_url=_required_env("OPENAI_BASE_URL"))
        api_mode = _required_env("OPENAI_API_MODE")
        if api_mode == "responses":
            response = client.responses.create(
                model=self.model,
                input=prompt,
                max_output_tokens=max_tokens,
            )
            return response.output_text or ""
        if api_mode != "chat_completions":
            raise RuntimeError("OPENAI_API_MODE 必须是 responses 或 chat_completions")
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
            base_url=_required_env("ANTHROPIC_BASE_URL"),
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

        base_url = _required_env("GOOGLE_BASE_URL")
        http_options = types.HttpOptions(base_url=base_url)
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


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value or not value.strip():
        raise RuntimeError(f"缺少 {name}")
    return value.strip()


# ---------------------------------------------------------------------------
# JSON 解析与修复
# ---------------------------------------------------------------------------

def _repair_truncated_json(text: str) -> str | None:
    if not (repaired := (text or "").rstrip()): return None
    stack, in_str, i = [], False, 0
    while i < len(repaired):
        if repaired[i] == "\\" and in_str:
            i += 2; continue
        if repaired[i] == '"': in_str = not in_str
        elif not in_str:
            if repaired[i] in "{[": stack.append(repaired[i])
            elif repaired[i] == "}" and stack and stack[-1] == "{": stack.pop()
            elif repaired[i] == "]" and stack and stack[-1] == "[": stack.pop()
        i += 1
    if in_str: repaired += '"'
    if repaired and repaired[-1] == ",": repaired = repaired[:-1]
    return repaired + "".join("}" if b == "{" else "]" for b in reversed(stack))



def extract_json(text: str) -> Any:
    """从模型回复中提取 JSON，支持截断修复。"""
    stripped = text.strip()

    # 去除 markdown 代码块标记
    fenced = re.search(r"```(?:json)?\s*(.*?)```", stripped, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        stripped = fenced.group(1).strip()

    # 1) 直接解析
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # 2) 定位 JSON 起始位置后解析
    starts = [index for index in (stripped.find("{"), stripped.find("[")) if index >= 0]
    if not starts:
        raise ValueError("模型回复中没有 JSON") from None

    json_text = stripped[min(starts):]
    decoder = json.JSONDecoder()
    try:
        payload, _ = decoder.raw_decode(json_text)
        return payload
    except json.JSONDecodeError:
        pass

    # 3) 尝试修复截断的 JSON
    repaired = _repair_truncated_json(json_text)
    if repaired:
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            pass
        # 修复后再尝试 raw_decode
        try:
            payload, _ = decoder.raw_decode(repaired)
            return payload
        except json.JSONDecodeError:
            pass

    # 所有尝试均失败
    raise ValueError("模型回复中没有合法 JSON（已尝试自动修复）") from None


def extract_json_with_retry(
    client: LlmClient,
    prompt: str,
    *,
    max_retries: int = 2,
    max_tokens: int = 6000,
) -> Any:
    """调用 LLM 并提取 JSON，失败时带错误反馈重试。

    每次重试会将上次的错误信息追加到 prompt 中，
    引导模型纠正输出格式。
    """
    last_error: Exception | None = None
    current_prompt = prompt

    for attempt in range(1 + max_retries):
        try:
            response = client.complete(current_prompt, max_tokens=max_tokens)
            return extract_json(response)
        except (ValueError, json.JSONDecodeError) as error:
            last_error = error
            logger.warning(
                "JSON 解析失败（第 %d/%d 次尝试）: %s",
                attempt + 1,
                1 + max_retries,
                error,
            )
            if attempt < max_retries:
                # 构造带有错误反馈的重试 prompt
                current_prompt = (
                    f"{prompt}\n\n"
                    f"【重要纠正】你上一次的回复无法被解析为合法 JSON。"
                    f"错误信息：{error}\n"
                    f"请严格修正格式，只输出合法 JSON，不要包含任何其他文本。"
                    f"确保所有字符串正确闭合，所有括号正确匹配。"
                )

    raise ValueError(f"经过 {1 + max_retries} 次尝试仍无法获取合法 JSON: {last_error}") from last_error


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
