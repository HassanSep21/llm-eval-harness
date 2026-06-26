import uuid
from datetime import datetime

from pydantic import BaseModel


# ---- Dataset ----

class DatasetCreate(BaseModel):
    name: str
    description: str | None = None
    tags: list[str] | None = None


class DatasetResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    tags: list[str] | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- TestCase ----

class TestCaseCreate(BaseModel):
    input: str
    expected_output: str | None = None
    metadata: dict | None = None


class TestCaseResponse(BaseModel):
    id: uuid.UUID
    dataset_id: uuid.UUID
    input: str
    expected_output: str | None
    metadata: dict
    created_at: datetime

    model_config = {"from_attributes": True}
    