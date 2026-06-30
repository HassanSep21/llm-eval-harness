import pytest

from app.metrics.registry import get_metric, list_metrics


class TestRegistry:
    def test_all_four_metrics_registered(self):
        registered = list_metrics()
        for name in ["exact_match", "contains", "regex_match", "rouge_l"]:
            assert name in registered

    def test_get_metric_returns_correct_instance(self):
        assert get_metric("exact_match").name == "exact_match"


class TestExactMatch:
    metric = get_metric("exact_match")

    def test_identical_strings_match(self):
        result = self.metric.evaluate(actual_output="refund issued", expected_output="refund issued")
        assert result.score == 1.0
        assert result.passed is True

    def test_different_strings_do_not_match(self):
        result = self.metric.evaluate(actual_output="refund issued", expected_output="refund denied")
        assert result.score == 0.0
        assert result.passed is False

    def test_case_sensitive(self):
        result = self.metric.evaluate(actual_output="Refund", expected_output="refund")
        assert result.score == 0.0

    def test_empty_strings_match(self):
        result = self.metric.evaluate(actual_output="", expected_output="")
        assert result.score == 1.0

    def test_missing_expected_output_raises(self):
        with pytest.raises(ValueError):
            self.metric.evaluate(actual_output="refund issued")


class TestContains:
    metric = get_metric("contains")

    def test_substring_present(self):
        result = self.metric.evaluate(actual_output="we issued a refund today", expected_output="refund")
        assert result.score == 1.0
        assert result.passed is True

    def test_substring_absent(self):
        result = self.metric.evaluate(actual_output="we denied the claim", expected_output="refund")
        assert result.score == 0.0

    def test_case_insensitive(self):
        result = self.metric.evaluate(actual_output="we issued a REFUND today", expected_output="refund")
        assert result.score == 1.0

    def test_empty_expected_output_always_matches(self):
        # "" is a substring of any string, including "" itself — documented Python behavior,
        # not a bug — covered explicitly so it's a deliberate fact, not an accidental pass.
        result = self.metric.evaluate(actual_output="anything", expected_output="")
        assert result.score == 1.0

    def test_missing_expected_output_raises(self):
        with pytest.raises(ValueError):
            self.metric.evaluate(actual_output="refund issued")


class TestRegexMatch:
    metric = get_metric("regex_match")

    def test_pattern_matches(self):
        result = self.metric.evaluate(actual_output="order #4471 shipped", pattern=r"#\d+")
        assert result.score == 1.0
        assert result.passed is True

    def test_pattern_does_not_match(self):
        result = self.metric.evaluate(actual_output="order shipped", pattern=r"#\d+")
        assert result.score == 0.0

    def test_partial_match_within_string_counts(self):
        # re.search, not re.match/fullmatch — pattern need not anchor the whole string
        result = self.metric.evaluate(actual_output="confirmed: refunded in full", pattern=r"refund\w*")
        assert result.score == 1.0

    def test_missing_pattern_raises(self):
        with pytest.raises(ValueError):
            self.metric.evaluate(actual_output="order shipped")


class TestRougeL:
    metric = get_metric("rouge_l")

    def test_identical_strings_score_one(self):
        result = self.metric.evaluate(
            actual_output="the refund was processed today",
            expected_output="the refund was processed today",
        )
        assert result.score == pytest.approx(1.0)

    def test_completely_disjoint_strings_score_zero(self):
        result = self.metric.evaluate(actual_output="apple banana cherry", expected_output="dog elephant fox")
        assert result.score == pytest.approx(0.0)

    def test_partial_overlap_scores_between_zero_and_one(self):
        result = self.metric.evaluate(
            actual_output="we processed your refund this morning",
            expected_output="your refund has been processed",
        )
        assert 0.0 < result.score < 1.0

    def test_empty_strings_do_not_crash(self):
        result = self.metric.evaluate(actual_output="", expected_output="")
        assert 0.0 <= result.score <= 1.0

    def test_missing_expected_output_raises(self):
        with pytest.raises(ValueError):
            self.metric.evaluate(actual_output="refund issued")
            