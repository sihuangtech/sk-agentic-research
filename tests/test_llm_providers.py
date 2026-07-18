from types import SimpleNamespace
from unittest.mock import MagicMock

from google import genai

from backend.infrastructure import llm


def test_openai_uses_custom_base_url(monkeypatch) -> None:
    client = MagicMock()
    client.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="openai-ok"))]
    )
    constructor = MagicMock(return_value=client)
    monkeypatch.setattr(llm, "OpenAI", constructor)
    monkeypatch.setenv("OPENAI_API_KEY", "secret")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://openai.local/v1")
    monkeypatch.setenv("OPENAI_API_MODE", "chat_completions")

    assert llm.ProviderLlmClient("custom-model")._openai("hello", 100) == "openai-ok"
    constructor.assert_called_once_with(api_key="secret", base_url="https://openai.local/v1")


def test_openai_responses_mode(monkeypatch) -> None:
    client = MagicMock()
    client.responses.create.return_value = SimpleNamespace(output_text="responses-ok")
    monkeypatch.setattr(llm, "OpenAI", MagicMock(return_value=client))
    monkeypatch.setenv("OPENAI_API_KEY", "secret")
    monkeypatch.setenv("OPENAI_API_MODE", "responses")

    result = llm.ProviderLlmClient("gpt-test")._openai("hello", 100)
    assert result == "responses-ok"
    client.responses.create.assert_called_once_with(
        model="gpt-test", input="hello", max_output_tokens=100
    )


def test_anthropic_uses_custom_base_url(monkeypatch) -> None:
    client = MagicMock()
    client.messages.create.return_value = SimpleNamespace(content=[SimpleNamespace(text="claude-ok")])
    constructor = MagicMock(return_value=client)
    monkeypatch.setattr(llm, "Anthropic", constructor)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "secret")
    monkeypatch.setenv("ANTHROPIC_BASE_URL", "https://anthropic.local")

    assert llm.ProviderLlmClient("claude-test")._anthropic("hello", 100) == "claude-ok"
    constructor.assert_called_once_with(api_key="secret", base_url="https://anthropic.local")


def test_google_uses_custom_base_url(monkeypatch) -> None:
    client = MagicMock()
    client.models.generate_content.return_value = SimpleNamespace(text="gemini-ok")
    context = MagicMock()
    context.__enter__.return_value = client
    constructor = MagicMock(return_value=context)
    monkeypatch.setattr(genai, "Client", constructor)
    monkeypatch.setenv("GOOGLE_API_KEY", "secret")
    monkeypatch.setenv("GOOGLE_BASE_URL", "https://google.local")

    assert llm.ProviderLlmClient("gemini-test")._gemini("hello", 100) == "gemini-ok"
    options = constructor.call_args.kwargs["http_options"]
    assert constructor.call_args.kwargs["api_key"] == "secret"
    assert options.base_url == "https://google.local"
