from typing import List, Dict, Any
from app.database import index_presentation_slide, search_presentations

def index_ocr_document(doc_name: str, pdf_path: str, page_results: List[Dict[str, Any]]):
    """Indexes each slide in SQLite FTS5 database for fast local search."""
    for page in page_results:
        slide_num = page.get("page", 1)
        elements = page.get("elements", [])
        text_content = "\n".join([e.get("text", "") for e in elements])
        
        # Pick representative image path if visual present
        visuals = page.get("visuals", [])
        image_path = visuals[0]["image_path"] if visuals else ""

        if text_content.strip():
            index_presentation_slide(
                doc_name=doc_name,
                pdf_path=pdf_path,
                slide_num=slide_num,
                text=text_content,
                image_path=image_path
            )

def search_slides(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Performs FTS5 search query returning matching slides and snippets."""
    if not query or not query.strip():
        return []
    return search_presentations(query.strip(), limit=limit)
