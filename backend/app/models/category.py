from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    icon: Mapped[str] = mapped_column(String(10), nullable=False, default="📦")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_fields: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    features:     Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    has_quantity:  Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    poster_layout: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
