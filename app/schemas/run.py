import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.run import RunStatus


class JudgeConfig(BaseModel):
    primary_backend: str = "groq"
    primary_model: str | None = None
    secondary_backend: str | None = "ollama"
    secondary_model: str | None = None
    metrics: list[str] = ["exact_match", "rouge_l"]
    dual_judge: bool = True


class EvalRunCreate(BaseModel):
    dataset_id: uuid.UUID
    target_model: str
    judge_config: JudgeConfig = JudgeConfig()


class EvalRunResponse(BaseModel):
    id: uuid.UUID
    dataset_id: uuid.UUID
    target_model: str
    status: RunStatus
    judge_config: dict
    calibration_report: dict | None
    error: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class TestCaseResultResponse(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    test_case_id: uuid.UUID
    actual_output: str | None
    metric_scores: dict
    primary_judge_score: dict | None
    secondary_judge_score: dict | None
    low_confidence: bool
    error: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
    