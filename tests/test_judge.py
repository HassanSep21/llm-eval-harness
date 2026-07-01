from unittest.mock import AsyncMock, patch
import pytest

from app.metrics.judge import LLMJudge
from app.backends.base import LLMBackend


VALID_JSON_RESPONSE = """{
    "correctness": {"score": 0.8, "reason": "Mostly correct but missed one detail"},
    "tone": {"score": 0.9, "reason": "Polite and professional"},
    "faithfulness": {"score": 0.7, "reason": "Slightly deviated from expected"},
    "conciseness": {"score": 0.6, "reason": "A bit verbose"}
}"""

PREAMBLE_WRAPPED_RESPONSE = """Sure! Here is my evaluation:
{
    "correctness": {"score": 0.8, "reason": "Mostly correct"},
    "tone": {"score": 0.9, "reason": "Good tone"},
    "faithfulness": {"score": 0.7, "reason": "Mostly faithful"},
    "conciseness": {"score": 0.6, "reason": "Slightly verbose"}
}
Hope that helps!"""

INVALID_JSON_RESPONSE = "I cannot evaluate this response."

OUT_OF_RANGE_RESPONSE = """{
    "correctness": {"score": 2.5, "reason": "Perfect"},
    "tone": {"score": 0.9, "reason": "Good"},
    "faithfulness": {"score": 0.7, "reason": "Faithful"},
    "conciseness": {"score": 0.6, "reason": "Concise"}
}"""

MISSING_DIMENSION_RESPONSE = """{
    "correctness": {"score": 0.8, "reason": "Good"},
    "tone": {"score": 0.9, "reason": "Fine"}
}"""


def make_mock_backend(responses: list[str]) -> LLMBackend:
    """Build a mock backend that returns responses in sequence."""
    backend = AsyncMock(spec=LLMBackend)
    backend.name = "mock"
    backend.generate = AsyncMock(side_effect=responses)
    return backend


class TestLLMJudgeHappyPath:
    @pytest.mark.asyncio
    async def test_valid_json_returns_judge_score(self):
        backend = make_mock_backend([VALID_JSON_RESPONSE])
        judge = LLMJudge(backend=backend, model="test-model")
        result = await judge.score(
            input="What is the refund policy?",
            expected_output="We offer a 30-day money-back guarantee.",
            actual_output="You can return items within 30 days for a full refund.",
        )
        assert result.error is None
        assert result.correctness.score == 0.8
        assert result.tone.score == 0.9
        assert result.faithfulness.score == 0.7
        assert result.conciseness.score == 0.6
        assert result.backend == "mock"

    @pytest.mark.asyncio
    async def test_preamble_wrapped_json_is_extracted(self):
        backend = make_mock_backend([PREAMBLE_WRAPPED_RESPONSE])
        judge = LLMJudge(backend=backend, model="test-model")
        result = await judge.score(
            input="What is the refund policy?",
            expected_output="We offer a 30-day money-back guarantee.",
            actual_output="You can return items within 30 days.",
        )
        assert result.error is None
        assert result.correctness.score == 0.8


class TestLLMJudgeRetryBehavior:
    @pytest.mark.asyncio
    async def test_retries_on_invalid_json_then_succeeds(self):
        # First two attempts return garbage, third returns valid JSON
        backend = make_mock_backend([
            INVALID_JSON_RESPONSE,
            INVALID_JSON_RESPONSE,
            VALID_JSON_RESPONSE,
        ])
        judge = LLMJudge(backend=backend, model="test-model")
        result = await judge.score(
            input="What is the refund policy?",
            expected_output="30-day guarantee.",
            actual_output="30 days refund.",
        )
        assert result.error is None
        assert backend.generate.call_count == 3

    @pytest.mark.asyncio
    async def test_all_retries_exhausted_returns_error_score(self):
        backend = make_mock_backend([
            INVALID_JSON_RESPONSE,
            INVALID_JSON_RESPONSE,
            INVALID_JSON_RESPONSE,
        ])
        judge = LLMJudge(backend=backend, model="test-model")
        result = await judge.score(
            input="What is the refund policy?",
            expected_output="30-day guarantee.",
            actual_output="30 days refund.",
        )
        assert result.error is not None
        assert result.correctness.score == 0.0
        assert backend.generate.call_count == 3

    @pytest.mark.asyncio
    async def test_out_of_range_score_triggers_retry(self):
        backend = make_mock_backend([
            OUT_OF_RANGE_RESPONSE,
            OUT_OF_RANGE_RESPONSE,
            VALID_JSON_RESPONSE,
        ])
        judge = LLMJudge(backend=backend, model="test-model")
        result = await judge.score(
            input="What is the refund policy?",
            expected_output="30-day guarantee.",
            actual_output="30 days refund.",
        )
        assert result.error is None
        assert backend.generate.call_count == 3

    @pytest.mark.asyncio
    async def test_missing_dimension_triggers_retry(self):
        backend = make_mock_backend([
            MISSING_DIMENSION_RESPONSE,
            MISSING_DIMENSION_RESPONSE,
            VALID_JSON_RESPONSE,
        ])
        judge = LLMJudge(backend=backend, model="test-model")
        result = await judge.score(
            input="What is the refund policy?",
            expected_output="30-day guarantee.",
            actual_output="30 days refund.",
        )
        assert result.error is None
        assert backend.generate.call_count == 3
        