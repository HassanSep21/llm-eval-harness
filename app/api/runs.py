import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.run import EvalRun, TestCaseResult
from app.schemas.run import EvalRunCreate, EvalRunResponse, TestCaseResultResponse
from app.services import runner

router = APIRouter(prefix="/runs", tags=["runs"])


@router.post("", response_model=EvalRunResponse, status_code=status.HTTP_201_CREATED)
async def create_run(
    payload: EvalRunCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
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
