from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.runs import router as runs_router
from app.api.datasets import router as datasets_router
from app.api.backends import router as backends_router
from app.api.regression import router as regression_router
from app.core.logging import configure_logging
from app.models import run # noqa: F401 — ensures EvalRun/TestCaseResult register with Base.metadata

@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    yield
    # nothing to clean up on shutdown yet — placeholder for later
    # (e.g. closing a shared httpx client, once Groq/Ollama backends exist)


def create_app() -> FastAPI:
    app = FastAPI(
        title="LLM Evaluation Harness",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(datasets_router)
    app.include_router(runs_router)
    app.include_router(backends_router)
    app.include_router(regression_router)
    return app


app = create_app()
