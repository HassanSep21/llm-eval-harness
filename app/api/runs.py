import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.backends.groq import GroqBackend
from app.backends.ollama import OllamaBackend
from app.models.dataset import Dataset, TestCase
from app.models.run import EvalRun, TestCaseResult, RunStatus
from app.schemas.run import EvalRunCreate, EvalRunResponse, JudgeConfig, TestCaseResultResponse
from app.services import runner

router = APIRouter(prefix="/runs", tags=["runs"])


async def _validate_run_request(payload: EvalRunCreate, db: AsyncSession) -> None:
    """Synchronous preflight checks — raises HTTPException on any failure.

    Catches problems that are knowable before the run starts so callers
    get an immediate 400/503 rather than a run that fails seconds later.
    """
    # 1. Dataset exists and has test cases
    dataset = await db.get(Dataset, payload.dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    count_result = await db.execute(
        select(func.count()).where(TestCase.dataset_id == payload.dataset_id)
    )
    case_count = count_result.scalar()
    if case_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Dataset has no test cases — add at least one before running an evaluation",
        )
    
    config = payload.judge_config

    # 2. Groq key present if Groq is involved
    if config.primary_backend == "groq" or config.secondary_backend == "groq":
        try:
            await GroqBackend().health_check()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
    # 3. Ollama reachable if Ollama is involved
    if config.primary_backend == "ollama" or config.secondary_backend == "ollama":
        try:
            await OllamaBackend().health_check()
        except Exception:
            raise HTTPException(
                status_code=503,
                detail="Ollama is unreachable — ensure the Ollama container is running",
            )


@router.post("", response_model=EvalRunResponse, status_code=status.HTTP_201_CREATED)
async def create_run(
    payload: EvalRunCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    await _validate_run_request(payload, db)

    run = EvalRun(
        dataset_id=payload.dataset_id,
        target_model=payload.target_model,
        judge_config=payload.judge_config.model_dump(),
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    background_tasks.add_task(runner.execute, run.id)
    return run


@router.get("/{run_id}", response_model=EvalRunResponse)
async def get_run(run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    run = await db.get(EvalRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/{run_id}/results", response_model=list[TestCaseResultResponse])
async def get_run_results(run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    run = await db.get(EvalRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    result = await db.execute(
        select(TestCaseResult).where(TestCaseResult.run_id == run_id)
    )
    return result.scalars().all()


@router.get("", response_model=list[EvalRunResponse])
async def list_runs(
    status_filter: RunStatus | None = Query(default=None, alias="status"),
    dataset_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(EvalRun).order_by(EvalRun.created_at.desc())
    if status_filter:
        query = query.where(EvalRun.status == status_filter)
    if dataset_id:
        query = query.where(EvalRun.dataset_id == dataset_id)
    result = await db.execute(query)
    return result.scalars().all()
