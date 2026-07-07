import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.core.db import get_db
from app.models.dataset import Dataset, TestCase
from app.schemas.dataset import (
    DatasetCreate,
    DatasetResponse,
    DatasetUpdate,
    TestCaseCreate,
    TestCaseResponse,
    TestCaseUpdate
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


@router.get("/{dataset_id}/test-cases", response_model=list[TestCaseResponse])
async def list_test_cases(dataset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    dataset = await db.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    result = await db.execute(
        select(TestCase)
        .where(TestCase.dataset_id == dataset_id)
        .order_by(TestCase.created_at.desc())
    )
    return result.scalars().all()


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


@router.get("", response_model=list[DatasetResponse])
async def list_datasets(tag: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Dataset).order_by(Dataset.created_at.desc())
    if tag:
        query = query.where(Dataset.tags.contains([tag]))
    result = await db.execute(query)
    datasets = result.scalars().all()

    if datasets:
        count_result = await db.execute(
            select(TestCase.dataset_id, func.count(TestCase.id))
            .where(TestCase.dataset_id.in_([d.id for d in datasets]))
            .group_by(TestCase.dataset_id)
        )
        counts = dict(count_result.all())
        for dataset in datasets:
            dataset.test_case_count = counts.get(dataset.id, 0)

    return datasets


@router.patch("/{dataset_id}", response_model=DatasetResponse)
async def update_dataset(
    dataset_id: uuid.UUID, payload: DatasetUpdate, db: AsyncSession = Depends(get_db)
):
    dataset = await db.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(dataset, key, value)

    await db.commit()
    await db.refresh(dataset)
    return dataset


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(dataset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    dataset = await db.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    await db.delete(dataset)
    await db.commit()


@router.patch("/{dataset_id}/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case(
    dataset_id: uuid.UUID,
    test_case_id: uuid.UUID,
    payload: TestCaseUpdate,
    db: AsyncSession = Depends(get_db),
):
    test_case = await db.get(TestCase, test_case_id)
    if test_case is None or test_case.dataset_id != dataset_id:
        raise HTTPException(status_code=404, detail="Test case not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "metadata" in update_data:
        update_data["case_metadata"] = update_data.pop("metadata")

    for key, value in update_data.items():
        setattr(test_case, key, value)

    await db.commit()
    await db.refresh(test_case)
    return test_case


@router.delete("/{dataset_id}/test-cases/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case(
    dataset_id: uuid.UUID, test_case_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    test_case = await db.get(TestCase, test_case_id)
    if test_case is None or test_case.dataset_id != dataset_id:
        raise HTTPException(status_code=404, detail="Test case not found")
    await db.delete(test_case)
    await db.commit()

