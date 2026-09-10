from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any

from app.module2_ocr.search_service import search_slides

router = APIRouter(prefix="/api/search", tags=["Local Presentation Search"])

@router.get("")
async def search_presentation_contents(q: str = Query(..., min_length=1), limit: int = 20):
    """Searches indexed presentation text using SQLite FTS5 engine."""
    results = search_slides(q, limit=limit)
    return {
        "query": q,
        "count": len(results),
        "results": results
    }
