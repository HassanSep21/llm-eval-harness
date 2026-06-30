from abc import ABC, abstractmethod
from pydantic import BaseModel


class MetricResult(BaseModel):
    """Structured output for any metric evaluation."""

    metric_name: str
    score: float          # normalized 0.0-1.0
    passed: bool | None = None   # for threshold-based metrics; None if not applicable
    details: dict = {}    # metric-specific extras (e.g. matched span, LCS length)


class Metric(ABC):
    """Common interface for all evaluation metrics.

    New metrics implement `name` and `evaluate()` only — the registry
    and runner never need to change to support a new metric.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
    def evaluate(self, *, actual_output: str, expected_output: str | None = None, **kwargs) -> MetricResult:
        ...
