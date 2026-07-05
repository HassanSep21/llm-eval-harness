import uuid
from pydantic import BaseModel


class TestCaseDelta(BaseModel):
    test_case_id: uuid.UUID
    dimension_deltas: dict[str, float]  # dimension → (run_b_score - run_a_score)
    regressed: bool
    improved: bool


class RegressionReport(BaseModel):
    run_a_id: uuid.UUID
    run_b_id: uuid.UUID
    dataset_id: uuid.UUID
    per_dimension_avg_delta: dict[str, float]  # dimension → mean delta across all cases
    regressed_cases: list[uuid.UUID]
    improved_cases: list[uuid.UUID]
    verdict: str  # improved | regressed | mixed | neutral
    regression_threshold: float
    case_deltas: list[TestCaseDelta]
    