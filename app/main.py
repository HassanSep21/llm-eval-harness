from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.datasets import router as datasets_router
from app.core.logging import configure_logging
from app.api.backends import router as backends_router


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
    app.include_router(datasets_router)
    return app


app = create_app()

app.include_router(backends_router)

