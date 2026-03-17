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

    series_map: dict[str, dict] = {}

    for item in items:
        serie = (
            item.custom_data.get("serie")
            or item.custom_data.get("series_name")
            or ""
        )
        if not serie:
            continue

        if serie not in series_map:
            series_map[serie] = {"tomes": [], "grouped": None, "individual_items": []}

        tome_raw = (
            item.custom_data.get("tome")
            or item.custom_data.get("volume_number")
        )

        if tome_raw is not None:
            try:
                series_map[serie]["tomes"].append(int(tome_raw))
            except (ValueError, TypeError):
                pass
            series_map[serie]["individual_items"].append(item)
        else:
            # No tome number → grouped item representing the whole series
            series_map[serie]["grouped"] = item

    result = []
    for serie, data in sorted(series_map.items()):
        tomes = sorted(set(data["tomes"]))
        grouped = data["grouped"]
        count = len(tomes) if tomes else (grouped.quantity if grouped else 0)
        completed_count = sum(
            1 for it in data["individual_items"] if it.reading_status == "completed"
        )
        read_up_to = grouped.read_up_to if grouped else None
        result.append({
            "serie":            serie,
            "owned_tomes":      tomes,
            "owned_count":      count,
            "grouped_item_id":  grouped.id if grouped else None,
            "grouped_quantity": grouped.quantity if grouped else None,
            "grouped_value":    float(grouped.value) if grouped and grouped.value is not None else None,
            "read_up_to":       read_up_to,
            "completed_count":  completed_count,
        })

    return result
