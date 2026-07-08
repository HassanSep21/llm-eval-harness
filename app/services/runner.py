import uuid
from datetime import datetime, UTC

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.backends.groq import GroqBackend
from app.backends.ollama import OllamaBackend
from app.core.db import AsyncSessionLocal
from app.metrics.judge import LLMJudge
from app.metrics.registry import get_metric
from app.models.dataset import TestCase
from app.models.run import EvalRun, RunStatus, TestCaseResult
from app.schemas.run import JudgeConfig


def _build_backend(name: str):
    if name == "groq":
        return GroqBackend()
    if name == "ollama":
        return OllamaBackend()
    raise ValueError(f"Unknown backend: {name!r}")


async def _get_run(session: AsyncSession, run_id: uuid.UUID) -> EvalRun | None:
    return await session.get(EvalRun, run_id)


async def execute(run_id: uuid.UUID) -> None:
    """Background entry point — owns the full lifecycle of one eval run."""
    async with AsyncSessionLocal() as session:
        run = await _get_run(session, run_id)
        if run is None:
            logger.error(f"Run {run_id} not found — background task exiting")
            return
        if run.status != RunStatus.pending:
            logger.warning(f"Run {run_id} is {run.status}, skipping execution")
            return

        # Mark running
        run.status = RunStatus.running
        await session.commit()
        logger.info(f"Run {run_id} started | dataset={run.dataset_id} model={run.target_model}")

        config = JudgeConfig(**run.judge_config)
        primary_backend = _build_backend(config.primary_backend)
        primary_judge = LLMJudge(
            backend=primary_backend,
            model=config.primary_model or "",
        )
        secondary_judge = None
        if config.dual_judge and config.secondary_backend:
            secondary_backend = _build_backend(config.secondary_backend)
            secondary_judge = LLMJudge(
                backend=secondary_backend,
                model=config.secondary_model or "",
            )

        # Target model always runs locally via Ollama — Groq/other backends are
        # judge-only in this architecture, never the model under test.
        target_backend = OllamaBackend()

        # Load test cases
        result = await session.execute(
            select(TestCase).where(TestCase.dataset_id == run.dataset_id)
        )
        test_cases = result.scalars().all()

        if not test_cases:
            run.status = RunStatus.failed
            run.error = "Dataset has no test cases"
            await session.commit()
            return

        # Per-dimension score accumulators for calibration
        primary_scores: dict[str, list[float]] = {d: [] for d in ["correctness", "tone", "faithfulness", "conciseness"]}
        secondary_scores: dict[str, list[float]] = {d: [] for d in ["correctness", "tone", "faithfulness", "conciseness"]}

        try:
            for tc in test_cases:
                case_error = None
                actual_output = None
                metric_scores = {}
                primary_judge_score = None
                secondary_judge_score = None
                low_confidence = False

                try:
                    # Call the target model
                    actual_output = await target_backend.generate(
                        messages=[{"role": "user", "content": tc.input}],
                        model=run.target_model,
                    )

                    # Deterministic metrics
                    for metric_name in config.metrics:
                        metric = get_metric(metric_name)
                        metric_result = metric.evaluate(
                            actual_output=actual_output,
                            expected_output=tc.expected_output,
                        )
                        metric_scores[metric_name] = metric_result.model_dump()

                    # Primary judge
                    p_score = await primary_judge.score(
                        input=tc.input,
                        expected_output=tc.expected_output or "",
                        actual_output=actual_output,
                    )
                    primary_judge_score = p_score.model_dump()
                    if p_score.error is None:
                        for dim in primary_scores:
                            primary_scores[dim].append(getattr(p_score, dim).score)

                    # Secondary judge
                    if secondary_judge:
                        s_score = await secondary_judge.score(
                            input=tc.input,
                            expected_output=tc.expected_output or "",
                            actual_output=actual_output,
                        )
                        secondary_judge_score = s_score.model_dump()
                        if s_score.error is None:
                            for dim in secondary_scores:
                                secondary_scores[dim].append(getattr(s_score, dim).score)

                            # Flag low confidence if any dimension disagrees above threshold
                            from app.core.config import get_settings
                            threshold = get_settings().judge_disagreement_threshold
                            if p_score.error is None:
                                deltas = [
                                    abs(getattr(p_score, d).score - getattr(s_score, d).score)
                                    for d in ["correctness", "tone", "faithfulness", "conciseness"]
                                ]
                                low_confidence = any(delta > threshold for delta in deltas)

                except Exception as e:
                    case_error = str(e)
                    logger.warning(f"Run {run_id} | case {tc.id} failed: {e}")

                # Persist result — committed per case so partial progress survives a run-level failure
                session.add(TestCaseResult(
                    run_id=run_id,
                    test_case_id=tc.id,
                    actual_output=actual_output,
                    metric_scores=metric_scores,
                    primary_judge_score=primary_judge_score,
                    secondary_judge_score=secondary_judge_score,
                    low_confidence=low_confidence,
                    error=case_error,
                ))
                await session.commit()

            # Calibration — only computed if dual judge ran and both produced valid scores
            calibration_report = None
            if secondary_judge and any(primary_scores["correctness"]):
                calibration_report = _compute_calibration(primary_scores, secondary_scores)

            run.status = RunStatus.completed
            run.calibration_report = calibration_report
            run.completed_at = datetime.now(UTC)
            await session.commit()
            logger.info(f"Run {run_id} completed")

        except Exception as e:
            # Roll back any uncommitted partial state from the current transaction
            await session.rollback()
            # Fresh write: mark the run itself as failed
            run = await _get_run(session, run_id)
            if run:
                run.status = RunStatus.failed
                run.error = str(e)
                await session.commit()
            logger.exception(f"Run {run_id} failed: {e}")


def _compute_calibration(
    primary: dict[str, list[float]],
    secondary: dict[str, list[float]],
) -> dict:
    """Inter-judge agreement: 1 - mean(|delta|) per dimension, then averaged overall."""
    dimension_agreement = {}
    all_agreements = []

    for dim in primary:
        p_vals = primary[dim]
        s_vals = secondary[dim]
        # Pair only indices where both judges produced a valid score
        pairs = list(zip(p_vals, s_vals))
        if not pairs:
            continue
        mean_delta = sum(abs(p - s) for p, s in pairs) / len(pairs)
        agreement = round(1.0 - mean_delta, 4)
        dimension_agreement[dim] = agreement
        all_agreements.append(agreement)

    return {
        "dimension_agreement": dimension_agreement,
        "overall_consistency": round(sum(all_agreements) / len(all_agreements), 4) if all_agreements else 0.0,
    }
