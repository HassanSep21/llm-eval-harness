import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.run import EvalRun, RunStatus, TestCaseResult
from app.schemas.regression import RegressionReport, TestCaseDelta

_DIMENSIONS = ["correctness", "tone", "faithfulness", "conciseness"]
_NEUTRAL_THRESHOLD = 0.05  # |avg_delta| below which a dimension is considered unchanged


def _classify_verdict(
    per_dimension_avg_delta: dict[str, float],
    regression_threshold: float,
) -> str:
    """Collapse per-dimension average deltas into a single verdict.

    Evaluation order:
      1. Neutral  — all |avg_delta| below _NEUTRAL_THRESHOLD
      2. Improved — ≥3 dimensions positive, none drops more than regression_threshold
      3. Regressed — ≥3 dimensions negative, none improves more than regression_threshold
      4. Mixed    — everything else
    """
    deltas = [per_dimension_avg_delta.get(d, 0.0) for d in _DIMENSIONS]

    # 1. Neutral — nothing moved meaningfully
    if all(abs(d) < _NEUTRAL_THRESHOLD for d in deltas):
        return "neutral"

    positive = sum(1 for d in deltas if d > _NEUTRAL_THRESHOLD)
    negative = sum(1 for d in deltas if d < -_NEUTRAL_THRESHOLD)

    # 2. Improved — majority of dimensions up, no dimension catastrophically down
    if positive >= 3 and all(d >= -regression_threshold for d in deltas):
        return "improved"

    # 3. Regressed — majority of dimensions down, no dimension meaningfully up
    if negative >= 3 and all(d <= regression_threshold for d in deltas):
        return "regressed"

    # 4. Mixed — meaningful movement in both directions
    return "mixed"


async def compare_runs(
    run_a_id: uuid.UUID,
    run_b_id: uuid.UUID,
    db: AsyncSession,
) -> RegressionReport:
    settings = get_settings()
    regression_threshold = settings.regression_threshold

    # Load and validate both runs
    run_a = await db.get(EvalRun, run_a_id)
    run_b = await db.get(EvalRun, run_b_id)

    if run_a is None or run_b is None:
        raise ValueError("One or both run IDs not found")
    if run_a.status != RunStatus.completed or run_b.status != RunStatus.completed:
        raise ValueError("Both runs must be completed before comparison")
    if run_a.dataset_id != run_b.dataset_id:
        raise ValueError("Runs must be on the same dataset to compare")

    # Load results for both runs, keyed by test_case_id for alignment
    def keyed(results) -> dict[uuid.UUID, TestCaseResult]:
        return {r.test_case_id: r for r in results}

    result_a = await db.execute(select(TestCaseResult).where(TestCaseResult.run_id == run_a_id))
    result_b = await db.execute(select(TestCaseResult).where(TestCaseResult.run_id == run_b_id))
    cases_a = keyed(result_a.scalars().all())
    cases_b = keyed(result_b.scalars().all())

    # Only compare cases present in both runs
    common_case_ids = set(cases_a.keys()) & set(cases_b.keys())

    case_deltas: list[TestCaseDelta] = []
    dimension_delta_accumulator: dict[str, list[float]] = {d: [] for d in _DIMENSIONS}

    for case_id in common_case_ids:
        ca = cases_a[case_id]
        cb = cases_b[case_id]

        # Skip cases where either run errored — can't compute a meaningful delta
        if ca.error or cb.error:
            continue

        dimension_deltas: dict[str, float] = {}

        for dim in _DIMENSIONS:
            score_a = _extract_judge_dimension(ca.primary_judge_score, dim)
            score_b = _extract_judge_dimension(cb.primary_judge_score, dim)

            if score_a is not None and score_b is not None:
                delta = round(score_b - score_a, 4)
                dimension_deltas[dim] = delta
                dimension_delta_accumulator[dim].append(delta)

        # A case regressed if any dimension dropped more than threshold
        regressed = any(d < -regression_threshold for d in dimension_deltas.values())
        # A case improved if any dimension rose more than threshold
        improved = any(d > regression_threshold for d in dimension_deltas.values())

        case_deltas.append(TestCaseDelta(
            test_case_id=case_id,
            dimension_deltas=dimension_deltas,
            regressed=regressed,
            improved=improved,
        ))

    # Per-dimension average deltas across all comparable cases
    per_dimension_avg_delta = {
        dim: round(sum(vals) / len(vals), 4) if vals else 0.0
        for dim, vals in dimension_delta_accumulator.items()
    }

    regressed_cases = [cd.test_case_id for cd in case_deltas if cd.regressed]
    improved_cases = [cd.test_case_id for cd in case_deltas if cd.improved]
    verdict = _classify_verdict(per_dimension_avg_delta, regression_threshold)

    return RegressionReport(
        run_a_id=run_a_id,
        run_b_id=run_b_id,
        dataset_id=run_a.dataset_id,
        per_dimension_avg_delta=per_dimension_avg_delta,
        regressed_cases=regressed_cases,
        improved_cases=improved_cases,
        verdict=verdict,
        regression_threshold=regression_threshold,
        case_deltas=case_deltas,
    )


def _extract_judge_dimension(judge_score: dict | None, dimension: str) -> float | None:
    """Safely pull a dimension score out of a stored JSONB judge score dict."""
    if judge_score is None:
        return None
    dim_data = judge_score.get(dimension)
    if dim_data is None:
        return None
    return dim_data.get("score")
