import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.api.deps import get_db

SQLALCHEMY_TEST_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    from app.models.category import Category  # noqa: F401
    from app.models.item import Item          # noqa: F401
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    from app.main import app

    def override_get_db():
        yield db

    original_key = settings.API_KEY
    settings.API_KEY = ""

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    settings.API_KEY = original_key


# ── Factories ──

@pytest.fixture()
def sample_category_data():
    return {
        "name": "Test Category",
        "icon": "🧪",
        "description": "A test category",
        "custom_fields": [
            {"key": "brand", "label": "Brand", "type": "text", "required": False, "options": None}
        ],
    }


@pytest.fixture()
def created_category(client, sample_category_data):
    resp = client.post("/api/categories/", json=sample_category_data)
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def sample_item_data(created_category):
    return {
        "category_id": created_category["id"],
        "name": "Test Item",
        "description": "A test item",
        "condition": "good",
        "is_owned": True,
        "value": "9.99",
        "custom_data": {"brand": "ACME"},
    }


@pytest.fixture()
def created_item(client, sample_item_data):
    resp = client.post("/api/items/", json=sample_item_data)
    assert resp.status_code == 201
    return resp.json()
