import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import setup_logging
from app.api.routes import categories, items, dashboard

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.DEBUG)
    logger.info(
        "MyStuff API starting — port=%s debug=%s db=%s@%s/%s",
        settings.API_PORT,
        settings.DEBUG,
        settings.DB_USER,
        settings.DB_HOST,
        settings.DB_NAME,
    )
    yield
    logger.info("MyStuff API shutting down")


app = FastAPI(
    title="MyStuff API",
    description="Personal inventory management API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

_uploads_dir = "/app/uploads"
try:
    os.makedirs(_uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")
except (PermissionError, OSError):
    pass  # Not in Docker; uploads endpoint unavailable in dev/test


@app.get("/health")
def health():
    return {"status": "ok"}
