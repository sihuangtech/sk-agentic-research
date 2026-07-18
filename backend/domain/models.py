"""跨 Agent 共享的结构化科研契约。"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


def utc_now() -> str:
    """返回可排序的 UTC 时间。"""
    return datetime.now(timezone.utc).isoformat()


class RunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_REVIEW = "waiting_review"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunStage(str, Enum):
    CREATED = "created"
    LITERATURE = "literature"
    IDEATION = "ideation"
    PLANNING = "planning"
    BASELINE = "baseline"
    EXPERIMENT = "experiment"
    VALIDATION = "validation"
    WRITING = "writing"
    COMPLETED = "completed"


class Decision(str, Enum):
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    INCONCLUSIVE = "inconclusive"
    INVALID = "invalid"


class Evidence(BaseModel):
    """可追踪到原始来源的文献或项目证据。"""

    id: str
    source: str
    title: str
    url: str
    abstract: str = ""
    year: int | None = None
    authors: list[str] = Field(default_factory=list)
    retrieved_at: str = Field(default_factory=utc_now)


class ReviewScore(BaseModel):
    novelty: int = Field(ge=1, le=10)
    feasibility: int = Field(ge=1, le=10)
    falsifiability: int = Field(ge=1, le=10)
    evidence_support: int = Field(ge=1, le=10)
    rationale: str

    @property
    def average(self) -> float:
        values = [self.novelty, self.feasibility, self.falsifiability, self.evidence_support]
        return round(sum(values) / len(values), 2)


class Hypothesis(BaseModel):
    id: str
    title: str = Field(min_length=3)
    problem: str
    hypothesis: str
    falsification_criteria: str
    independent_variable: str
    dependent_variables: list[str] = Field(min_length=1)
    baselines: list[str] = Field(min_length=1)
    expected_outcome: str
    novelty: str
    evidence_ids: list[str] = Field(min_length=1)
    review: ReviewScore


class MetricSpec(BaseModel):
    name: str
    json_path: str
    direction: Literal["maximize", "minimize"]
    minimum_delta: float = 0.0


class ExperimentArm(BaseModel):
    name: str
    entrypoint: str
    kind: Literal["python", "notebook"] = "python"
    parameters: dict[str, Any] = Field(default_factory=dict)

    @field_validator("entrypoint")
    @classmethod
    def validate_entrypoint(cls, value: str) -> str:
        if value.startswith(("/", "~")) or ".." in value.split("/"):
            raise ValueError("实验入口必须是工作目录内的相对路径")
        return value


class ExperimentManifest(BaseModel):
    version: int = 1
    objective: str
    metric: MetricSpec
    baseline: ExperimentArm
    candidate: ExperimentArm
    train_seeds: list[int] = Field(min_length=2)
    validation_seeds: list[int] = Field(min_length=2)
    max_iterations: int = Field(default=2, ge=1, le=10)
    required_modules: list[str] = Field(default_factory=list)
    expected_result_schema: dict[str, str] = Field(default_factory=dict)

    @field_validator("train_seeds", "validation_seeds")
    @classmethod
    def require_unique_seeds(cls, value: list[int]) -> list[int]:
        if not value or len(value) != len(set(value)):
            raise ValueError("种子列表不能为空且不得重复")
        return value

    @field_validator("required_modules")
    @classmethod
    def validate_modules(cls, value: list[str]) -> list[str]:
        if any(not item.replace("_", "").isalnum() for item in value):
            raise ValueError("required_modules 只能填写顶级 Python 模块名")
        return sorted(set(value))


class TrialResult(BaseModel):
    arm: str
    seed: int
    phase: Literal["train", "validation"]
    status: Literal["succeeded", "failed", "timeout", "blocked"]
    metric: float | None = None
    duration_seconds: float = 0.0
    exit_code: int | None = None
    output_path: str | None = None
    stdout_path: str | None = None
    stderr_path: str | None = None
    error: str | None = None


class ValidationReport(BaseModel):
    decision: Decision
    metric_name: str
    direction: Literal["maximize", "minimize"]
    baseline_mean: float | None = None
    candidate_mean: float | None = None
    absolute_delta: float | None = None
    relative_delta: float | None = None
    candidate_cv: float | None = None
    success_rate: float = 0.0
    reasons: list[str] = Field(default_factory=list)
    train_trials: list[TrialResult] = Field(default_factory=list)
    validation_trials: list[TrialResult] = Field(default_factory=list)


class ResearchRun(BaseModel):
    id: str
    title: str
    direction: str
    status: RunStatus = RunStatus.QUEUED
    stage: RunStage = RunStage.CREATED
    decision: Decision | None = None
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)
    completed_stages: list[RunStage] = Field(default_factory=list)
    artifacts: dict[str, str] = Field(default_factory=dict)
    metrics: dict[str, float | str | None] = Field(default_factory=dict)
    error: str | None = None
