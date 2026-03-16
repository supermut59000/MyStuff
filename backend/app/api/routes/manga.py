from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_api_key
from app.models.item import Item

router = APIRouter(
    prefix="/manga",
    tags=["manga"],
    dependencies=[Depends(verify_api_key)],
)


@router.get("/series")
def get_manga_series(
    category_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """
    Group items in the given category by their 'serie' custom_data field.
    Returns each series with its owned tome numbers so the frontend can
    compute missing tomes after fetching total_volumes from AniList.
    """
    items = (
        db.query(Item)
        .filter(Item.category_id == category_id)
        .all()
    )

    series_map: dict[str, list[int]] = {}

    for item in items:
        serie = (
            item.custom_data.get("serie")
            or item.custom_data.get("series_name")
            or ""
        )
        if not serie:
            continue

        tome_raw = (
            item.custom_data.get("tome")
            or item.custom_data.get("volume_number")
        )

        if serie not in series_map:
            series_map[serie] = []

        if tome_raw is not None:
            try:
                series_map[serie].append(int(tome_raw))
            except (ValueError, TypeError):
                pass

    result = []
    for serie, tomes in sorted(series_map.items()):
        owned = sorted(set(tomes))
        result.append({
            "serie":       serie,
            "owned_tomes": owned,
            "owned_count": len(owned),
        })

    return result
