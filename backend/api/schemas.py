"""HTTP 请求模型。"""

from pydantic import BaseModel, Field, field_validator


class ResearchRequest(BaseModel):
    direction: str = Field(min_length=2, max_length=300)
    max_ideas: int | None = Field(default=None, ge=1, le=20)


class ApprovalRequest(BaseModel):
    reviewer: str = Field(default="local-user", min_length=1, max_length=100)


class ProviderCredentialUpdate(BaseModel):
    api_key: str | None = Field(default=None, max_length=4096)
    base_url: str | None = Field(default=None, max_length=2048)
    model_id: str | None = Field(default=None, max_length=300)
    api_mode: str | None = Field(default=None, max_length=30)

    @field_validator("api_key", "base_url", "model_id", "api_mode")
    @classmethod
    def reject_newlines(cls, value: str | None) -> str | None:
        if value and ("\n" in value or "\r" in value):
            raise ValueError("配置值不得包含换行符")
        return value
