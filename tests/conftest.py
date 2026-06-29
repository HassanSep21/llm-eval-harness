import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.db import Base, get_db
from app.main import create_app
from app.models.dataset import Dataset, TestCase

settings = get_settings()

# Dedicated test database — never the dev one. This means running the
# test suite can never wipe or corrupt data you're poking at manually
# via curl or /docs in another terminal.
TEST_DATABASE_URL = settings.database_url.rsplit("/", 1)[0] + "/llm_eval_test"

test_engine = create_async_engine(TEST_DATABASE_URL)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create every table once before any test runs, drop them all once
    the whole test session ends. scope='session' means this runs exactly
    twice total, not once per test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def clean_tables():
    """Runs before every individual test. Delete test_cases before
    datasets — the FK would otherwise block deleting a dataset that
    still has children."""
    async with TestSessionLocal() as session:
        await session.execute(TestCase.__table__.delete())
        await session.execute(Dataset.__table__.delete())
        await session.commit()


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
        