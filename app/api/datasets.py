import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.dataset import Dataset, TestCase
from app.schemas.dataset import (
    DatasetCreate,
    DatasetResponse,
    TestCaseCreate,
    TestCaseResponse,
)

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(payload: DatasetCreate, db: AsyncSession = Depends(get_db)):
    dataset = Dataset(**payload.model_dump())
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    return dataset


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    dataset = await db.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post(
    "/{dataset_id}/test-cases",
    response_model=TestCaseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_test_case(
    dataset_id: uuid.UUID,
    payload: TestCaseCreate,
    db: AsyncSession = Depends(get_db),
):
    dataset = await db.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    test_case = TestCase(
        dataset_id=dataset_id,
        input=payload.input,
        expected_output=payload.expected_output,
        case_metadata=payload.metadata or {},
    )
    db.add(test_case)
    await db.commit()
    await db.refresh(test_case)
    return test_case


@router.get("/{dataset_id}/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def get_test_case(
    dataset_id: uuid.UUID,
    test_case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    test_case = await db.get(TestCase, test_case_id)
    if test_case is None or test_case.dataset_id != dataset_id:
        raise HTTPException(status_code=404, detail="Test case not found")
    return test_case
