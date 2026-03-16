from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON, Boolean, DateTime, Enum, ForeignKey,
    Integer, Numeric, String, Text, func,
)

from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    condition: Mapped[str] = mapped_column(
        Enum("mint", "good", "fair", "poor", name="condition_enum"),
        nullable=False,
        default="good",
    )
    is_owned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    value: Mapped[Decimal | None] = mapped_column("item_value", Numeric(10, 2), nullable=True)
    custom_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    # Category-specific status columns (all nullable)
    reading_status: Mapped[str | None] = mapped_column(
        Enum("completed", "reading", "owned_unread", "plan_to_read", name="reading_status_enum"),
        nullable=True,
    )
    wear_status: Mapped[str | None] = mapped_column(
        Enum("active", "stored", "to_sell", "to_donate", name="wear_status_enum"),
        nullable=True,
    )
    deployment_status: Mapped[str | None] = mapped_column(
        Enum("in_use_pc", "in_use_server", "in_use_other", "storage", "to_sell", "broken", name="deployment_status_enum"),
        nullable=True,
    )
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
