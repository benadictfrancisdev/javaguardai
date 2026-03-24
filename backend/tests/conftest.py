import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend is on sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Use SQLite for tests (no external DB needed for unit tests)
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("INGESTION_API_KEY", "test-api-key")
os.environ.setdefault("OPENAI_API_KEY", "")
os.environ.setdefault("REDIS_URL", "")
os.environ.setdefault("ENV", "test")

from core.database import Base  # noqa: E402
from core.models import Error, Analysis  # noqa: E402, F401


TEST_DB_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    """Yield a fresh DB session for each test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    """FastAPI TestClient wired to the test DB."""
    from fastapi.testclient import TestClient
    from core.database import get_db
    from main import app

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
