"""独立验证门禁：只用留出种子决定结论是否成立。"""

from __future__ import annotations

import json
import math
import statistics
from pathlib import Path
from typing import Any

from backend.domain.models import Decision, MetricSpec, TrialResult, ValidationReport


def extract_metric(payload: dict[str, Any], json_path: str) -> float:
    """按点号路径读取标量指标，例如 metrics.accuracy。"""
    value: Any = payload
    for part in json_path.split("."):
        if not isinstance(value, dict) or part not in value:
            raise ValueError(f"结果缺少指标路径: {json_path}")
        value = value[part]
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"指标 {json_path} 必须是数值")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"指标 {json_path} 不是有限数")
    return number


def attach_metrics(trials: list[TrialResult], metric: MetricSpec) -> list[TrialResult]:
    for trial in trials:
        if trial.status != "succeeded" or not trial.output_path:
            continue
        try:
            payload = json.loads(Path(trial.output_path).read_text(encoding="utf-8"))
            trial.metric = extract_metric(payload, metric.json_path)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            trial.status = "failed"
            trial.error = str(error)
    return trials


class ResultValidator:
    def __init__(self, minimum_success_rate: float, maximum_cv: float):
        self.minimum_success_rate = minimum_success_rate
        self.maximum_cv = maximum_cv

    def validate(
        self,
        metric: MetricSpec,
        train_trials: list[TrialResult],
        validation_trials: list[TrialResult],
    ) -> ValidationReport:
        baseline = self._values(validation_trials, "baseline")
        candidate = self._values(validation_trials, "candidate")
        expected = len(validation_trials)
        succeeded = sum(trial.metric is not None for trial in validation_trials)
        success_rate = succeeded / expected if expected else 0.0
        reasons: list[str] = []

        if success_rate < self.minimum_success_rate:
            reasons.append(
                f"验证成功率 {success_rate:.0%} 低于门槛 {self.minimum_success_rate:.0%}"
            )
        if not baseline or not candidate:
            reasons.append("基线或候选方案缺少有效验证指标")
        if reasons:
            return self._report(Decision.INVALID, metric, success_rate, reasons, train_trials, validation_trials)

        baseline_mean = statistics.fmean(baseline)
        candidate_mean = statistics.fmean(candidate)
        raw_delta = candidate_mean - baseline_mean
        improvement = raw_delta if metric.direction == "maximize" else -raw_delta
        relative = improvement / abs(baseline_mean) if baseline_mean else None
        cv = self._cv(candidate)

        if cv > self.maximum_cv:
            decision = Decision.INCONCLUSIVE
            reasons.append(f"候选结果变异系数 {cv:.3f} 高于门槛 {self.maximum_cv:.3f}")
        elif improvement >= metric.minimum_delta:
            decision = Decision.ACCEPTED
            reasons.append(f"留出集改进 {improvement:.6g} 达到门槛 {metric.minimum_delta:.6g}")
        else:
            decision = Decision.REJECTED
            reasons.append(f"留出集改进 {improvement:.6g} 未达到门槛 {metric.minimum_delta:.6g}")

        return ValidationReport(
            decision=decision,
            metric_name=metric.name,
            direction=metric.direction,
            baseline_mean=baseline_mean,
            candidate_mean=candidate_mean,
            absolute_delta=improvement,
            relative_delta=relative,
            candidate_cv=cv,
            success_rate=success_rate,
            reasons=reasons,
            train_trials=train_trials,
            validation_trials=validation_trials,
        )

    @staticmethod
    def _values(trials: list[TrialResult], arm: str) -> list[float]:
        return [trial.metric for trial in trials if trial.arm == arm and trial.metric is not None]

    @staticmethod
    def _cv(values: list[float]) -> float:
        if len(values) < 2:
            return 0.0
        mean = abs(statistics.fmean(values))
        deviation = statistics.stdev(values)
        return deviation / mean if mean > 1e-12 else (0.0 if deviation == 0 else math.inf)

    @staticmethod
    def _report(
        decision: Decision,
        metric: MetricSpec,
        success_rate: float,
        reasons: list[str],
        train: list[TrialResult],
        validation: list[TrialResult],
    ) -> ValidationReport:
        return ValidationReport(
            decision=decision,
            metric_name=metric.name,
            direction=metric.direction,
            success_rate=success_rate,
            reasons=reasons,
            train_trials=train,
            validation_trials=validation,
        )
