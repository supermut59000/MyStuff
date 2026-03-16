from typing import Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_api_key
from app.schemas.item import ItemCreate, ItemListResponse, ItemResponse, ItemUpdate
from app.services.item_service import ItemService

router = APIRouter(
    prefix="/items",
    tags=["items"],
    dependencies=[Depends(verify_api_key)],
)


class BulkDeleteRequest(BaseModel):
    ids: list[int]


class BulkMoveRequest(BaseModel):
    ids: list[int]
    category_id: int


class BulkCreateRequest(BaseModel):
    items: list[ItemCreate]


@router.get("/export/csv")
def export_csv(
    category_id: Optional[int] = Query(None),
    is_owned: Optional[bool] = Query(None),
    condition: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    csv_content = ItemService(db).export_csv(
        category_id=category_id,
        is_owned=is_owned,
        condition=condition,
        search=search,
    )
    return Response(
        content="\ufeff" + csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=items.csv"},
    )


@router.get("/", response_model=ItemListResponse)
def list_items(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = Query(None),
    is_owned: Optional[bool] = Query(None),
    condition: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    return ItemService(db).list_items(
        page=page,
        per_page=per_page,
        category_id=category_id,
        is_owned=is_owned,
        condition=condition,
        search=search,
        sort=sort,
        order=order,
    )


@router.post("/", response_model=ItemResponse, status_code=201)
def create_item(data: ItemCreate, db: Session = Depends(get_db)):
    return ItemService(db).create_item(data)


@router.post("/bulk-create", status_code=201)
def bulk_create(data: BulkCreateRequest, db: Session = Depends(get_db)):
    count = ItemService(db).bulk_create(data.items)
    return {"created": count}


@router.post("/bulk-delete")
def bulk_delete(data: BulkDeleteRequest, db: Session = Depends(get_db)):
    count = ItemService(db).bulk_delete(data.ids)
    return {"deleted": count}


@router.post("/bulk-move")
def bulk_move(data: BulkMoveRequest, db: Session = Depends(get_db)):
    count = ItemService(db).bulk_move(data.ids, data.category_id)
    return {"moved": count}


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    return ItemService(db).get_item(item_id)


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, data: ItemUpdate, db: Session = Depends(get_db)):
    return ItemService(db).update_item(item_id, data)


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    ItemService(db).delete_item(item_id)


@router.post("/{item_id}/image", response_model=ItemResponse)
async def upload_image(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    file_data = await file.read()
    return ItemService(db).upload_image(item_id, file_data, file.content_type or "")


@router.delete("/{item_id}/image", response_model=ItemResponse)
def delete_image(item_id: int, db: Session = Depends(get_db)):
    return ItemService(db).delete_image(item_id)
