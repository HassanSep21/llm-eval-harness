from app.services.regression import _classify_verdict, _extract_judge_dimension


class TestClassifyVerdict:
    def test_all_dimensions_neutral(self):
        deltas = {"correctness": 0.01, "tone": -0.01, "faithfulness": 0.02, "conciseness": 0.0}
        assert _classify_verdict(deltas, 0.1) == "neutral"

    def test_improved_three_positive_none_drops_past_threshold(self):
        deltas = {"correctness": 0.2, "tone": 0.15, "faithfulness": 0.1, "conciseness": -0.05}
        assert _classify_verdict(deltas, 0.1) == "improved"

    def test_improved_blocked_by_large_drop(self):
        # 3 dims clearly positive but one drops past regression_threshold → mixed, not improved
        deltas = {"correctness": 0.2, "tone": 0.15, "faithfulness": 0.1, "conciseness": -0.2}
        assert _classify_verdict(deltas, 0.1) == "mixed"

    def test_regressed_three_negative_none_rises_past_threshold(self):
        deltas = {"correctness": -0.2, "tone": -0.15, "faithfulness": -0.1, "conciseness": 0.03}
        assert _classify_verdict(deltas, 0.1) == "regressed"

    def test_regressed_blocked_by_large_gain(self):
        # 3 dims clearly negative but one rises past threshold → mixed, not regressed
        deltas = {"correctness": -0.2, "tone": -0.15, "faithfulness": -0.1, "conciseness": 0.2}
        assert _classify_verdict(deltas, 0.1) == "mixed"

    def test_mixed_split_movement(self):
        deltas = {"correctness": 0.2, "tone": -0.2, "faithfulness": 0.15, "conciseness": -0.15}
        assert _classify_verdict(deltas, 0.1) == "mixed"

    def test_only_two_positive_falls_through_to_mixed(self):
        deltas = {"correctness": 0.2, "tone": 0.15, "faithfulness": -0.1, "conciseness": -0.1}
        assert _classify_verdict(deltas, 0.1) == "mixed"


class TestExtractJudgeDimension:
    def test_extracts_score_correctly(self):
        judge_score = {
            "correctness": {"score": 0.8, "reason": "Good"},
            "tone": {"score": 0.7, "reason": "Fine"},
        }
        assert _extract_judge_dimension(judge_score, "correctness") == 0.8

    def test_none_judge_score_returns_none(self):
        assert _extract_judge_dimension(None, "correctness") is None

    def test_missing_dimension_returns_none(self):
        judge_score = {"tone": {"score": 0.7, "reason": "Fine"}}
        assert _extract_judge_dimension(judge_score, "correctness") is None

    def test_missing_score_key_returns_none(self):
        judge_score = {"correctness": {"reason": "No score key"}}
        assert _extract_judge_dimension(judge_score, "correctness") is None
        