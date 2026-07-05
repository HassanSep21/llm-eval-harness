from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.regression import RegressionReport
from app.services.regression import compare_runs

router = APIRouter(prefix="/regression", tags=["regression"])


class CompareRequest(BaseModel):
    run_a_id: uuid.UUID
    run_b_id: uuid.UUID


@router.post("/compare", response_model=RegressionReport)
async def compare(payload: CompareRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await compare_runs(payload.run_a_id, payload.run_b_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
