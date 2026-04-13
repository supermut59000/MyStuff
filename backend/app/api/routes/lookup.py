import logging
import re
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import verify_api_key
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/lookup",
    tags=["lookup"],
    dependencies=[Depends(verify_api_key)],
)


class UPCResult(BaseModel):
    title: str
    description: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    upc: str
    funko_serie: Optional[str] = None
    funko_numero: Optional[int] = None
    funko_character: Optional[str] = None
    funko_exclusive: bool = False


def parse_funko_title(title: str) -> dict:
    """Parse a Funko Pop product title to extract structured fields.

    Common patterns:
      "Funko POP! Animation: Dragon Ball Z - Goku #9"
      "Funko Pop! Marvel: Avengers Endgame - Iron Man"
      "Funko POP! Games: Fortnite - Skull Trooper #438"
      "Funko POP! Star Wars: The Mandalorian - The Child #368 (Exclusive)"
    """
    result: dict = {
        "serie": None,
        "numero": None,
        "character": None,
        "exclusive": False,
    }

    if re.search(r"\b(?:exclusive|exclusif|exclus)\b", title, re.IGNORECASE):
        result["exclusive"] = True

    # Remove trailing parenthetical (Exclusive), (Chase), etc.
    clean = re.sub(r"\s*\([^)]*\)\s*$", "", title).strip()

    num_match = re.search(r"#(\d+)", clean)
    if num_match:
        result["numero"] = int(num_match.group(1))
        clean = clean[: num_match.start()].strip()

    # "Funko POP! <Line>: <Series> - <Character>"
    m = re.match(
        r"Funko\s+POP!?\s*[^:]*:\s*(.+?)\s*[-–]\s*(.+)",
        clean,
        re.IGNORECASE,
    )
    if m:
        result["serie"] = m.group(1).strip()
        result["character"] = m.group(2).strip()
    else:
        # "Funko POP! <anything> - <Character>"
        m2 = re.match(
            r"Funko\s+POP!?\s*[^-–]+[-–]\s*(.+)",
            clean,
            re.IGNORECASE,
        )
        if m2:
            result["character"] = m2.group(1).strip()
        else:
            # Reversed: "<Character> Funko Pop <Series>"
            m3 = re.match(
                r"(.+?)\s+Funko\s+POP!?\s*(.+)",
                clean,
                re.IGNORECASE,
            )
            if m3:
                result["character"] = re.sub(
                    r"^(?:authentic|official)\s+", "", m3.group(1), flags=re.IGNORECASE
                ).strip()
                result["serie"] = m3.group(2).strip()

    return result


@router.get("/upc/{code}", response_model=UPCResult)
async def lookup_upc(code: str):
    """Look up a product by UPC/EAN barcode via UPCitemdb (free tier: 100 req/day)."""
    async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT) as client:
        try:
            resp = await client.get(
                f"https://api.upcitemdb.com/prod/trial/lookup?upc={code}"
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="UPC lookup timed out")

        if resp.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="UPC lookup rate limit exceeded (100/day)",
            )
        if resp.status_code != 200:
            logger.warning("UPCitemdb returned %d for code %s", resp.status_code, code)
            raise HTTPException(
                status_code=502,
                detail=f"UPC lookup failed: {resp.status_code}",
            )

        data = resp.json()
        items = data.get("items", [])
        if not items:
            raise HTTPException(
                status_code=404, detail=f"No product found for UPC: {code}"
            )

        item = items[0]
        title = item.get("title", "")
        brand = item.get("brand", "")
        images = item.get("images", [])

        funko: dict = {}
        is_funko = bool(re.search(r"\bfunko\b", f"{title} {brand}", re.IGNORECASE))
        if is_funko:
            funko = parse_funko_title(title)

        logger.info("UPC lookup %s → %s (funko=%s)", code, title, is_funko)
        return UPCResult(
            title=title,
            description=item.get("description") or None,
            brand=brand or None,
            image_url=images[0] if images else None,
            upc=code,
            funko_serie=funko.get("serie"),
            funko_numero=funko.get("numero"),
            funko_character=funko.get("character"),
            funko_exclusive=funko.get("exclusive", False),
        )
