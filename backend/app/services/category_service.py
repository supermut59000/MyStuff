import logging
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.item import Item
from app.schemas.category import CategoryCreate, CategoryUpdate

logger = logging.getLogger(__name__)


class CategoryService:
    def __init__(self, db: Session):
        self.db = db

    def list_categories(self) -> list[dict]:
        rows = (
            self.db.query(
                Category,
                func.count(Item.id).label("item_count"),
                func.coalesce(func.sum(Item.value * Item.quantity), 0).label("total_value"),
            )
            .outerjoin(Item, Item.category_id == Category.id)
            .group_by(Category.id)
            .order_by(Category.name)
            .all()
        )
        result = []
        for cat, count, total_value in rows:
            d = {
                "id":            cat.id,
                "name":          cat.name,
                "icon":          cat.icon,
                "description":   cat.description,
                "custom_fields": cat.custom_fields,
                "features":     cat.features,
                "has_quantity":  cat.has_quantity,
                "poster_layout": cat.poster_layout,
                "item_count":    count,
                "total_value":   float(total_value),
                "created_at":    cat.created_at,
                "updated_at":    cat.updated_at,
            }
            result.append(d)
        return result

    def get_category(self, category_id: int) -> Category:
        cat = self.db.query(Category).filter(Category.id == category_id).first()
        if not cat:
            logger.warning("Category %d not found", category_id)
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")
        return cat

    def get_category_with_count(self, category_id: int) -> dict:
        row = (
            self.db.query(Category, func.count(Item.id).label("item_count"))
            .outerjoin(Item, Item.category_id == Category.id)
            .filter(Category.id == category_id)
            .group_by(Category.id)
            .first()
        )
        if not row:
            logger.warning("Category %d not found", category_id)
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")
        cat, count = row
        return {
            "id":            cat.id,
            "name":          cat.name,
            "icon":          cat.icon,
            "description":   cat.description,
            "custom_fields": cat.custom_fields,
            "has_quantity":  cat.has_quantity,
            "poster_layout": cat.poster_layout,
            "item_count":    count,
            "created_at":    cat.created_at,
            "updated_at":    cat.updated_at,
        }

    def create_category(self, data: CategoryCreate) -> dict:
        existing = self.db.query(Category).filter(Category.name == data.name).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Category name '{data.name}' already exists.",
            )
        cat = Category(
            name=data.name,
            icon=data.icon,
            description=data.description,
            features=list(data.features),
            has_quantity=data.has_quantity,
            poster_layout=data.poster_layout,
            custom_fields=[f.model_dump() for f in data.custom_fields],
        )
        self.db.add(cat)
        self.db.commit()
        self.db.refresh(cat)
        logger.info("Category created: id=%d name=%s", cat.id, cat.name)
        return self.get_category_with_count(cat.id)

    def update_category(self, category_id: int, data: CategoryUpdate) -> dict:
        cat = self.get_category(category_id)
        update = data.model_dump(exclude_unset=True)

        if "name" in update and update["name"] != cat.name:
            conflict = self.db.query(Category).filter(Category.name == update["name"]).first()
            if conflict:
                raise HTTPException(
                    status_code=400,
                    detail=f"Category name '{update['name']}' already exists.",
                )

        if "custom_fields" in update and update["custom_fields"] is not None:
            update["custom_fields"] = [
                f.model_dump() if hasattr(f, "model_dump") else f
                for f in data.custom_fields  # type: ignore[union-attr]
            ]

        for field, value in update.items():
            setattr(cat, field, value)

        self.db.commit()
        self.db.refresh(cat)
        return self.get_category_with_count(cat.id)

    def delete_category(self, category_id: int) -> None:
        cat = self.get_category(category_id)
        item_count = self.db.query(func.count(Item.id)).filter(Item.category_id == category_id).scalar()
        if item_count > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete category with existing items. Move or delete items first.",
            )
        self.db.delete(cat)
        self.db.commit()
        logger.info("Category deleted: id=%d name=%s", category_id, cat.name)
