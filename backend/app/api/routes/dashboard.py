from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_api_key
from app.models.category import Category
from app.models.item import Item

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(verify_api_key)],
)


class CategoryStat(BaseModel):
    category_id:    int
    name:           str
    icon:           str
    count:          int
    wishlist_count: int
    total_value:    float


class DashboardStats(BaseModel):
    total_items:    int
    total_owned:    int
    total_wishlist: int
    total_value:    float
    by_category:    list[CategoryStat]


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    total_items    = db.query(func.count(Item.id)).scalar() or 0
    total_owned    = db.query(func.count(Item.id)).filter(Item.is_owned == True).scalar() or 0
    total_wishlist = db.query(func.count(Item.id)).filter(Item.is_owned == False).scalar() or 0
    total_value    = db.query(func.sum(Item.value * Item.quantity)).filter(Item.is_owned == True).scalar() or 0.0

    rows = (
        db.query(
            Category.id,
            Category.name,
            Category.icon,
            func.count(Item.id).label("count"),
            func.sum(
                case((Item.is_owned == False, 1), else_=0)
            ).label("wishlist_count"),
            func.coalesce(func.sum(Item.value * Item.quantity), 0).label("total_value"),
        )
        .outerjoin(Item, Item.category_id == Category.id)
        .group_by(Category.id, Category.name, Category.icon)
        .order_by(Category.name)
        .all()
    )

    by_category = [
        CategoryStat(
            category_id=r.id,
            name=r.name,
            icon=r.icon,
            count=r.count or 0,
            wishlist_count=int(r.wishlist_count or 0),
            total_value=float(r.total_value or 0),
        )
        for r in rows
    ]

    return DashboardStats(
        total_items=total_items,
        total_owned=total_owned,
        total_wishlist=total_wishlist,
        total_value=float(total_value),
        by_category=by_category,
    )
