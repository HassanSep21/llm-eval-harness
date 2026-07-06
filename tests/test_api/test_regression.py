import uuid
from datetime import datetime, UTC

import pytest

from app.models.dataset import Dataset, TestCase
from app.models.run import EvalRun, RunStatus, TestCaseResult
from app.services.regression import compare_runs


def _make_judge_score(correctness, tone, faithfulness, conciseness):
    return {
        "correctness": {"score": correctness, "reason": "test"},
        "tone": {"score": tone, "reason": "test"},
        "faithfulness": {"score": faithfulness, "reason": "test"},
        "conciseness": {"score": conciseness, "reason": "test"},
    }


@pytest.fixture
async def seeded_runs(db_session):
    """Two completed runs on the same dataset, with one test case each."""
    dataset = Dataset(name="regression-test-dataset")
    db_session.add(dataset)
    await db_session.flush()

    tc = TestCase(
        dataset_id=dataset.id,
        input="What is the capital of France?",
        expected_output="Paris",
        case_metadata={},
    )
    db_session.add(tc)
    await db_session.flush()

    run_a = EvalRun(
        dataset_id=dataset.id,
        target_model="llama3.1:8b",
        status=RunStatus.completed,
        judge_config={},
        completed_at=datetime.now(UTC),
    )
    run_b = EvalRun(
        dataset_id=dataset.id,
        target_model="llama3.1:8b",
        status=RunStatus.completed,
        judge_config={},
        completed_at=datetime.now(UTC),
    )
    db_session.add_all([run_a, run_b])
    await db_session.flush()

    result_a = TestCaseResult(
        run_id=run_a.id,
        test_case_id=tc.id,
        actual_output="Paris",
        metric_scores={},
        primary_judge_score=_make_judge_score(0.7, 0.6, 0.7, 0.8),
    )
    result_b = TestCaseResult(
        run_id=run_b.id,
        test_case_id=tc.id,
        actual_output="The capital of France is Paris.",
        metric_scores={},
        primary_judge_score=_make_judge_score(0.9, 0.9, 0.9, 0.5),
    )
    db_session.add_all([result_a, result_b])
    await db_session.commit()

    return {"run_a": run_a, "run_b": run_b, "test_case": tc, "dataset": dataset}


class TestCompareRunsService:
    async def test_happy_path_returns_report(self, seeded_runs, db_session):
        report = await compare_runs(seeded_runs["run_a"].id, seeded_runs["run_b"].id, db_session)
        assert report.run_a_id == seeded_runs["run_a"].id
        assert report.run_b_id == seeded_runs["run_b"].id
        assert report.dataset_id == seeded_runs["dataset"].id
        assert len(report.case_deltas) == 1
        assert report.verdict in {"improved", "regressed", "mixed", "neutral"}

    async def test_deltas_are_run_b_minus_run_a(self, seeded_runs, db_session):
        report = await compare_runs(seeded_runs["run_a"].id, seeded_runs["run_b"].id, db_session)
        # correctness: 0.9 - 0.7 = 0.2
        assert report.per_dimension_avg_delta["correctness"] == pytest.approx(0.2)
        # conciseness: 0.5 - 0.8 = -0.3
        assert report.per_dimension_avg_delta["conciseness"] == pytest.approx(-0.3)

    async def test_invalid_run_id_raises(self, db_session):
        with pytest.raises(ValueError, match="not found"):
            await compare_runs(uuid.uuid4(), uuid.uuid4(), db_session)

    async def test_different_datasets_raises(self, db_session):
        dataset_a = Dataset(name="dataset-a")
        dataset_b = Dataset(name="dataset-b")
        db_session.add_all([dataset_a, dataset_b])
        await db_session.flush()

        run_a = EvalRun(
            dataset_id=dataset_a.id, target_model="m",
            status=RunStatus.completed, judge_config={}, completed_at=datetime.now(UTC)
        )
        run_b = EvalRun(
            dataset_id=dataset_b.id, target_model="m",
            status=RunStatus.completed, judge_config={}, completed_at=datetime.now(UTC)
        )
        db_session.add_all([run_a, run_b])
        await db_session.commit()

        with pytest.raises(ValueError, match="same dataset"):
            await compare_runs(run_a.id, run_b.id, db_session)

    async def test_pending_run_raises(self, seeded_runs, db_session):
        pending_run = EvalRun(
            dataset_id=seeded_runs["dataset"].id,
            target_model="m",
            status=RunStatus.pending,
            judge_config={},
        )
        db_session.add(pending_run)
        await db_session.commit()

        with pytest.raises(ValueError, match="completed"):
            await compare_runs(seeded_runs["run_a"].id, pending_run.id, db_session)


class TestRegressionApiEndpoint:
    async def test_compare_endpoint_returns_report(self, seeded_runs, client):
        response = await client.post(
            "/regression/compare",
            json={
                "run_a_id": str(seeded_runs["run_a"].id),
                "run_b_id": str(seeded_runs["run_b"].id),
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["verdict"] in {"improved", "regressed", "mixed", "neutral"}
        assert "per_dimension_avg_delta" in body
        assert len(body["case_deltas"]) == 1

    async def test_compare_endpoint_invalid_ids_returns_400(self, client):
        response = await client.post(
            "/regression/compare",
            json={"run_a_id": str(uuid.uuid4()), "run_b_id": str(uuid.uuid4())},
        )
        assert response.status_code == 400
        