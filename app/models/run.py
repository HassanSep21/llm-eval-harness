import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.db import Base


class RunStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class EvalRun(Base):
    __tablename__ = "eval_runs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"))
    target_model: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[RunStatus] = mapped_column(Enum(RunStatus), default=RunStatus.pending)
    judge_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    calibration_report: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    results: Mapped[list["TestCaseResult"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class TestCaseResult(Base):
    __tablename__ = "test_case_results"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("eval_runs.id", ondelete="CASCADE"))
    test_case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("test_cases.id", ondelete="CASCADE"))
    actual_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    metric_scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    primary_judge_score: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    secondary_judge_score: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    low_confidence: Mapped[bool] = mapped_column(Boolean, default=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    run: Mapped["EvalRun"] = relationship(back_populates="results")
    