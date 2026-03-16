from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, model_validator

FieldType = Literal["text", "number", "boolean", "select", "date"]


class CustomFieldDefinition(BaseModel):
    key:      str
    label:    str
    type:     FieldType
    required: bool = False
    options:  Optional[list[str]] = None  # only for type="select"

    @model_validator(mode="after")
    def options_required_for_select(self) -> "CustomFieldDefinition":
        if self.type == "select" and not self.options:
            raise ValueError(
                f"Field '{self.key}' is type 'select' but has no options defined."
            )
        if self.type != "select" and self.options is not None:
            raise ValueError(
                f"Field '{self.key}' is type '{self.type}' "
                f"but options are only valid for 'select'."
            )
        return self


class CategoryBase(BaseModel):
    name:          str
    icon:          str = "📦"
    description:   Optional[str] = None
    custom_fields: list[CustomFieldDefinition] = []
    has_quantity:  bool = False


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name:          Optional[str] = None
    icon:          Optional[str] = None
    description:   Optional[str] = None
    custom_fields: Optional[list[CustomFieldDefinition]] = None
    has_quantity:  Optional[bool] = None


class CategoryResponse(CategoryBase):
    id:         int
    item_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
