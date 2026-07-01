from pydantic import BaseModel


class DimensionScore(BaseModel):
    score: float
    reason: str


class JudgeScore(BaseModel):
    correctness: DimensionScore
    tone: DimensionScore
    faithfulness: DimensionScore
    conciseness: DimensionScore
    model: str
    backend: str
    error: str | None = None  # populated if parsing failed after all retries
