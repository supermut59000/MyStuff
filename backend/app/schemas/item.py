from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict

ConditionType = Literal["mint", "good", "fair", "poor"]
ReadingStatusType = Literal["completed", "reading", "owned_unread", "plan_to_read"]
WearStatusType = Literal["active", "stored", "to_sell", "to_donate"]
DeploymentStatusType = Literal["in_use_pc", "in_use_server", "in_use_other", "storage", "to_sell", "broken"]


class ItemBase(BaseModel):
    name:              str
    description:       Optional[str] = None
    condition:         ConditionType = "good"
    is_owned:          bool = True
    quantity:          int = 1
    value:             Optional[Decimal] = None
    custom_data:       dict[str, Any] = {}
    reading_status:    Optional[ReadingStatusType] = None
    wear_status:       Optional[WearStatusType] = None
    deployment_status: Optional[DeploymentStatusType] = None
    image_path:        Optional[str] = None
    lent_to:           Optional[str] = None
    lent_at:           Optional[date] = None
    read_up_to:        Optional[int] = None


class ItemCreate(ItemBase):
    category_id: int


class ItemUpdate(BaseModel):
    name:              Optional[str] = None
    description:       Optional[str] = None
    condition:         Optional[ConditionType] = None
    is_owned:          Optional[bool] = None
    quantity:          Optional[int] = None
    value:             Optional[Decimal] = None
    custom_data:       Optional[dict[str, Any]] = None
    reading_status:    Optional[ReadingStatusType] = None
    wear_status:       Optional[WearStatusType] = None
    deployment_status: Optional[DeploymentStatusType] = None
    lent_to:           Optional[str] = None
    lent_at:           Optional[date] = None
    read_up_to:        Optional[int] = None


class ItemResponse(ItemBase):
    id:          int
    category_id: int
    deleted_at:  Optional[datetime] = None
    created_at:  datetime
    updated_at:  datetime

    model_config = ConfigDict(from_attributes=True)


class ItemListResponse(BaseModel):
    items:    list[ItemResponse]
    total:    int
    page:     int
    per_page: int
    pages:    int
