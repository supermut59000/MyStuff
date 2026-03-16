from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_api_key
from app.models.item import Item
from app.models.category import Category

router = APIRouter(
    prefix="/search",
    tags=["search"],
    dependencies=[Depends(verify_api_key)],
)


@router.get("/")
def global_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Item, Category)
        .join(Category, Item.category_id == Category.id)
        .filter(Item.name.ilike(f"%{q}%"))
        .order_by(Item.name)
        .limit(limit)
        .all()
    )
    return [
        {
            "id":            item.id,
            "name":          item.name,
            "category_id":   item.category_id,
            "category_name": cat.name,
            "category_icon": cat.icon,
            "condition":     item.condition,
            "is_owned":      item.is_owned,
            "value":         str(item.value) if item.value else None,
            "image_path":    item.image_path,
        }
        for item, cat in rows
    ]
