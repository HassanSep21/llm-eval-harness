import re

from app.metrics.base import Metric, MetricResult
from app.metrics.registry import register
from rouge_score import rouge_scorer


class ExactMatch(Metric):
    """Case-sensitive string equality between actual and expected output."""

    @property
    def name(self) -> str:
        return "exact_match"

    def evaluate(self, *, actual_output: str, expected_output: str | None = None, **kwargs) -> MetricResult:
        if expected_output is None:
            raise ValueError("exact_match requires expected_output")
        is_match = actual_output == expected_output
        return MetricResult(metric_name=self.name, score=1.0 if is_match else 0.0, passed=is_match)


class Contains(Metric):
    """Substring check: does actual_output contain expected_output?

    Case-insensitive by default since this is typically used to check
    for a required phrase/keyword, not an exact transcript match.
    """

    @property
    def name(self) -> str:
        return "contains"

    def evaluate(self, *, actual_output: str, expected_output: str | None = None, **kwargs) -> MetricResult:
        if expected_output is None:
            raise ValueError("contains requires expected_output")
        is_match = expected_output.lower() in actual_output.lower()
        return MetricResult(metric_name=self.name, score=1.0 if is_match else 0.0, passed=is_match)


class RegexMatch(Metric):
    """Does a given regex pattern match somewhere in actual_output?

    Pattern is passed via kwargs (not expected_output) since it's a
    pattern, not a literal string to compare against.
    """

    @property
    def name(self) -> str:
        return "regex_match"

    def evaluate(self, *, actual_output: str, expected_output: str | None = None, pattern: str | None = None, **kwargs) -> MetricResult:
        if pattern is None:
            raise ValueError("regex_match requires a 'pattern' kwarg")
        is_match = re.search(pattern, actual_output) is not None
        return MetricResult(metric_name=self.name, score=1.0 if is_match else 0.0, passed=is_match, details={"pattern": pattern})


class RougeL(Metric):
    """ROUGE-L: F1 score over the longest common subsequence of tokens
    between actual_output and expected_output.
    """
    def __init__(self):
        self._scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)

    @property
    def name(self) -> str:
        return "rouge_l"

    def evaluate(self, *, actual_output: str, expected_output: str | None = None, **kwargs) -> MetricResult:
        if expected_output is None:
            raise ValueError("rouge_l requires expected_output")
        result = self._scorer.score(expected_output, actual_output)["rougeL"]
        return MetricResult(
            metric_name=self.name,
            score=result.fmeasure,
            details={"precision": result.precision, "recall": result.recall},
        )


register(ExactMatch())
register(Contains())
register(RegexMatch())
register(RougeL())
