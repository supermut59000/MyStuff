import csv
import io
import logging
import os
import uuid
from datetime import datetime, timezone
from math import ceil
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.category import Category
from app.models.item import Item
from app.schemas.category import CustomFieldDefinition
from app.schemas.item import ItemCreate, ItemListResponse, ItemResponse, ItemUpdate

logger = logging.getLogger(__name__)

ALLOWED_SORT_FIELDS = {"name", "created_at", "value"}


def validate_custom_data(
    custom_data: dict,
    custom_fields: list[CustomFieldDefinition],
) -> dict:
    errors = []
    cleaned = {}
    field_map = {f.key: f for f in custom_fields}

    for key, field_def in field_map.items():
        value = custom_data.get(key)

        if field_def.required and (value is None or value == ""):
            errors.append(f"Field '{field_def.label}' is required.")
            continue

        if value is None:
            continue

        if field_def.type == "number" and not isinstance(value, (int, float)):
            errors.append(
                f"Field '{field_def.label}' must be a number, got {type(value).__name__}."
            )
        elif field_def.type == "boolean" and not isinstance(value, bool):
            errors.append(f"Field '{field_def.label}' must be a boolean.")
        elif field_def.type == "select" and value not in (field_def.options or []):
            errors.append(
                f"Field '{field_def.label}' must be one of: "
                f"{', '.join(field_def.options or [])}. Got '{value}'."
            )
        elif field_def.type in ("text", "date") and not isinstance(value, str):
            errors.append(f"Field '{field_def.label}' must be a string.")
        else:
            cleaned[key] = value

    if errors:
        logger.warning("Custom data validation failed: %s", errors)
        raise HTTPException(
            status_code=422,
            detail={"message": "Custom data validation failed", "errors": errors},
        )

    return cleaned


class ItemService:
    def __init__(self, db: Session):
        self.db = db

    def _get_category_fields(self, category_id: int) -> list[CustomFieldDefinition]:
        cat = self.db.query(Category).filter(Category.id == category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")
        return [CustomFieldDefinition(**f) for f in (cat.custom_fields or [])]

    def list_items(
        self,
        page: int = 1,
        per_page: int = 20,
        category_id: Optional[int] = None,
        is_owned: Optional[bool] = None,
        condition: Optional[str] = None,
        search: Optional[str] = None,
        sort: str = "created_at",
        order: str = "desc",
        reading_status: Optional[str] = None,
        wear_status: Optional[str] = None,
        deployment_status: Optional[str] = None,
    ) -> ItemListResponse:
        per_page = min(per_page, 100)
        sort = sort if sort in ALLOWED_SORT_FIELDS else "created_at"
        order = "asc" if order == "asc" else "desc"

        q = self.db.query(Item).filter(Item.deleted_at.is_(None))

        if category_id is not None:
            q = q.filter(Item.category_id == category_id)
        if is_owned is not None:
            q = q.filter(Item.is_owned == is_owned)
        if condition:
            q = q.filter(Item.condition == condition)
        if search:
            q = q.filter(Item.name.ilike(f"%{search}%"))
        if reading_status:
            q = q.filter(Item.reading_status == reading_status)
        if wear_status:
            q = q.filter(Item.wear_status == wear_status)
        if deployment_status:
            q = q.filter(Item.deployment_status == deployment_status)

        sort_col = getattr(Item, sort)
        q = q.order_by(sort_col.asc() if order == "asc" else sort_col.desc())

        total = q.count()
        pages = ceil(total / per_page) if per_page else 1
        items = q.offset((page - 1) * per_page).limit(per_page).all()

        return ItemListResponse(
            items=[ItemResponse.model_validate(i) for i in items],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    def get_item(self, item_id: int) -> Item:
        item = (
            self.db.query(Item)
            .filter(Item.id == item_id, Item.deleted_at.is_(None))
            .first()
        )
        if not item:
            logger.warning("Item %d not found", item_id)
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
        return item

    def create_item(self, data: ItemCreate) -> Item:
        fields = self._get_category_fields(data.category_id)
        cleaned = validate_custom_data(data.custom_data, fields)

        item = Item(
            category_id=data.category_id,
            name=data.name,
            description=data.description,
            condition=data.condition,
            is_owned=data.is_owned,
            quantity=data.quantity,
            value=data.value,
            custom_data=cleaned,
            reading_status=data.reading_status,
            wear_status=data.wear_status,
            deployment_status=data.deployment_status,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        logger.info("Item created: id=%d category_id=%d", item.id, item.category_id)
        return item

    def bulk_create(self, items: list[ItemCreate]) -> list[int]:
        created = []
        for data in items:
            fields = self._get_category_fields(data.category_id)
            cleaned = validate_custom_data(data.custom_data, fields)
            item = Item(
                category_id=data.category_id,
                name=data.name,
                description=data.description,
                condition=data.condition,
                is_owned=data.is_owned,
                quantity=data.quantity,
                value=data.value,
                custom_data=cleaned,
                reading_status=data.reading_status,
                wear_status=data.wear_status,
                deployment_status=data.deployment_status,
            )
            self.db.add(item)
            created.append(item)
        self.db.commit()
        ids = [item.id for item in created]
        logger.info("Bulk created %d items: ids=%s", len(ids), ids)
        return ids

    def update_item(self, item_id: int, data: ItemUpdate) -> Item:
        item = self.get_item(item_id)
        update = data.model_dump(exclude_unset=True)

        if "custom_data" in update:
            fields = self._get_category_fields(item.category_id)
            merged = {**item.custom_data, **update["custom_data"]}
            update["custom_data"] = validate_custom_data(merged, fields)

        for field, value in update.items():
            setattr(item, field, value)

        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_item(self, item_id: int) -> None:
        """Soft-delete: sets deleted_at timestamp."""
        item = self.get_item(item_id)
        item.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        logger.info("Item soft-deleted: id=%d", item_id)

    # ── Trash ────────────────────────────────────────────────────────────────

    def list_trash(self) -> list[Item]:
        return (
            self.db.query(Item)
            .filter(Item.deleted_at.isnot(None))
            .order_by(Item.deleted_at.desc())
            .all()
        )

    def restore_item(self, item_id: int) -> Item:
        item = (
            self.db.query(Item)
            .filter(Item.id == item_id, Item.deleted_at.isnot(None))
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found in trash")
        item.deleted_at = None
        self.db.commit()
        self.db.refresh(item)
        logger.info("Item restored: id=%d", item_id)
        return item

    def permanent_delete_item(self, item_id: int) -> None:
        """Hard-delete a trashed item. Also removes its image file."""
        item = (
            self.db.query(Item)
            .filter(Item.id == item_id, Item.deleted_at.isnot(None))
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found in trash")
        if item.image_path:
            path = os.path.join(settings.UPLOAD_DIR, item.image_path)
            if os.path.exists(path):
                os.remove(path)
        self.db.delete(item)
        self.db.commit()
        logger.info("Item permanently deleted: id=%d", item_id)

    def empty_trash(self) -> int:
        """Permanently delete all trashed items."""
        items = self.db.query(Item).filter(Item.deleted_at.isnot(None)).all()
        count = len(items)
        for item in items:
            if item.image_path:
                path = os.path.join(settings.UPLOAD_DIR, item.image_path)
                if os.path.exists(path):
                    os.remove(path)
            self.db.delete(item)
        self.db.commit()
        logger.info("Trash emptied: %d items permanently deleted", count)
        return count

    # ── Bulk ─────────────────────────────────────────────────────────────────

    def bulk_delete(self, ids: list[int]) -> int:
        """Soft-delete multiple items."""
        now = datetime.now(timezone.utc)
        count = (
            self.db.query(Item)
            .filter(Item.id.in_(ids), Item.deleted_at.is_(None))
            .update({"deleted_at": now}, synchronize_session=False)
        )
        self.db.commit()
        logger.info("Bulk soft-deleted %d items", count)
        return count

    def bulk_move(self, ids: list[int], category_id: int) -> int:
        cat = self.db.query(Category).filter(Category.id == category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")
        count = (
            self.db.query(Item)
            .filter(Item.id.in_(ids), Item.deleted_at.is_(None))
            .update({"category_id": category_id}, synchronize_session=False)
        )
        self.db.commit()
        return count

    # ── Lending ──────────────────────────────────────────────────────────────

    def get_lent_items(self) -> list[Item]:
        return (
            self.db.query(Item)
            .filter(Item.lent_to.isnot(None), Item.deleted_at.is_(None))
            .order_by(Item.lent_at)
            .all()
        )

    # ── CSV ──────────────────────────────────────────────────────────────────

    def export_csv(
        self,
        category_id: Optional[int] = None,
        is_owned: Optional[bool] = None,
        condition: Optional[str] = None,
        search: Optional[str] = None,
    ) -> str:
        result = self.list_items(
            page=1,
            per_page=10000,
            category_id=category_id,
            is_owned=is_owned,
            condition=condition,
            search=search,
        )

        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")
        writer.writerow([
            "ID", "Name", "Category ID", "Condition", "Owned",
            "Value", "Description", "Custom Data", "Created At",
        ])
        for item in result.items:
            writer.writerow([
                item.id,
                item.name,
                item.category_id,
                item.condition,
                "yes" if item.is_owned else "no",
                str(item.value) if item.value is not None else "",
                item.description or "",
                str(item.custom_data),
                item.created_at.isoformat(),
            ])
        return output.getvalue()

    # ── Images ───────────────────────────────────────────────────────────────

    def upload_image(self, item_id: int, file_data: bytes, content_type: str) -> Item:
        from PIL import Image
        import io as _io

        item = self.get_item(item_id)
        if content_type not in ("image/jpeg", "image/png", "image/webp"):
            raise HTTPException(status_code=422, detail="Only JPEG, PNG, and WebP images are supported.")
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_data) > max_bytes:
            raise HTTPException(status_code=422, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB} MB.")

        if item.image_path:
            old_path = os.path.join(settings.UPLOAD_DIR, item.image_path)
            if os.path.exists(old_path):
                os.remove(old_path)

        img = Image.open(_io.BytesIO(file_data))
        img = img.convert("RGB")
        dim = settings.IMAGE_MAX_DIMENSION
        img.thumbnail((dim, dim), Image.LANCZOS)

        item_dir = os.path.join(settings.UPLOAD_DIR, str(item_id))
        os.makedirs(item_dir, exist_ok=True)
        filename = f"{uuid.uuid4().hex}.jpg"
        img.save(os.path.join(item_dir, filename), "JPEG", quality=settings.IMAGE_QUALITY)

        item.image_path = f"{item_id}/{filename}"
        self.db.commit()
        self.db.refresh(item)
        logger.info("Image uploaded for item %d: %s", item_id, item.image_path)
        return item

    def delete_image(self, item_id: int) -> Item:
        item = self.get_item(item_id)
        if item.image_path:
            path = os.path.join(settings.UPLOAD_DIR, item.image_path)
            if os.path.exists(path):
                os.remove(path)
            item.image_path = None
            self.db.commit()
            self.db.refresh(item)
        return item
