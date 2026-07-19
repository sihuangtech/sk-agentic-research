"""集中加载并校验 YAML 配置，避免各 Agent 各自读配置。"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictConfigModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LlmSettings(StrictConfigModel):
    provider: Literal["openai", "anthropic", "google"]
    reviewer_provider: Literal["openai", "anthropic", "google"]
    reviewer_model: str
    max_tokens: int = Field(ge=256, le=32000)


class SearchSettings(StrictConfigModel):
    providers: list[str]
    results_per_provider: int = Field(ge=1, le=20)
    request_timeout_seconds: int = Field(ge=3, le=120)


class ExperimentSettings(StrictConfigModel):
    executor: Literal["local"]
    timeout_minutes: int = Field(ge=1, le=1440)
    train_seeds: list[int] = Field(min_length=2)
    validation_seeds: list[int] = Field(min_length=2)
    max_iterations: int = Field(ge=1, le=10)
    minimum_success_rate: float = Field(ge=0.5, le=1.0)
    maximum_coefficient_of_variation: float = Field(ge=0.0, le=2.0)

    @field_validator("train_seeds", "validation_seeds")
    @classmethod
    def seeds_must_be_unique(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("种子列表不得重复")
        return value

    @field_validator("validation_seeds")
    @classmethod
    def seeds_must_be_held_out(cls, value: list[int], info: Any) -> list[int]:
        train = set(info.data.get("train_seeds", []))
        if train.intersection(value):
            raise ValueError("验证种子必须与开发种子完全分离")
        return value


class SecuritySettings(StrictConfigModel):
    allow_network: bool
    max_memory_mb: int = Field(ge=256)
    max_output_kb: int = Field(ge=64)
    blocked_modules: list[str]


class WorkflowSettings(StrictConfigModel):
    max_concurrent_pipelines: int = Field(ge=1, le=8)
    max_ideas_per_cycle: int = Field(ge=1, le=20)
    hypothesis_review_threshold: float = Field(ge=1, le=10)
    daemon_interval_minutes: int = Field(ge=1)
    human_review_before_execution: bool


class AppConfig(StrictConfigModel):
    workspace_dir: str
    research_directions: list[str]
    llm: LlmSettings
    search: SearchSettings
    experiment: ExperimentSettings
    security: SecuritySettings
    workflow: WorkflowSettings


def load_config(path: str | Path = "config.yaml") -> AppConfig:
    """加载配置并用领域约束进行校验。"""
    config_path = Path(path)
    with config_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return AppConfig.model_validate(data)


def save_config(config: AppConfig, path: str | Path = "config.yaml") -> None:
    """原子保存配置，避免进程中断留下半个 YAML 文件。"""
    config_path = Path(path)
    temp_path = config_path.with_suffix(config_path.suffix + ".tmp")
    payload = config.model_dump(mode="json")
    temp_path.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")
    os.replace(temp_path, config_path)
