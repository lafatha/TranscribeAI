import sqlite3
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.config import DB_PATH

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db():
    conn = get_db()
    with conn:
        # Jobs table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                job_type TEXT NOT NULL,
                status TEXT NOT NULL,
                file_path TEXT NOT NULL,
                progress REAL DEFAULT 0.0,
                message TEXT DEFAULT '',
                output_path TEXT,
                metadata_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # Slide Review candidates table for Tool 1
        conn.execute("""
            CREATE TABLE IF NOT EXISTS job_slides (
                job_id TEXT NOT NULL,
                slide_id INTEGER NOT NULL,
                frame_idx INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                timestamp_sec REAL NOT NULL,
                quality_score REAL NOT NULL,
                sharpness REAL NOT NULL,
                similarity_score REAL NOT NULL,
                image_path TEXT NOT NULL,
                is_selected INTEGER DEFAULT 1,
                quad_detected INTEGER DEFAULT 0,
                PRIMARY KEY (job_id, slide_id),
                FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
            );
        """)

        # FTS5 table for full-text search across presentations (Tool 2)
        conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS presentation_search USING fts5(
                document_name,
                pdf_path,
                slide_number UNINDEXED,
                full_text,
                image_path UNINDEXED
            );
        """)
    conn.close()

def escape_fts5_query(query: str) -> str:
    """
    Escapes FTS5 query string safely to prevent syntax crashes on special symbols (c++, OR, *, etc).
    """
    if not query:
        return ""
    # Strip dangerous tokens
    clean = re.sub(r'[^\w\s]', ' ', query)
    tokens = [t.strip() for t in clean.split() if t.strip()]
    if not tokens:
        return ""
    # Wrap tokens in quotes with prefix matching
    return " ".join([f'"{t}"*' for t in tokens])

# Database Helper Functions
def save_job(job_dict: Dict[str, Any]):
    conn = get_db()
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO jobs (id, job_type, status, file_path, progress, message, output_path, metadata_json, created_at, updated_at)
            VALUES (:id, :job_type, :status, :file_path, :progress, :message, :output_path, :metadata_json, :created_at, :updated_at)
        """, {
            "id": job_dict["id"],
            "job_type": job_dict["job_type"],
            "status": job_dict["status"],
            "file_path": job_dict["file_path"],
            "progress": job_dict.get("progress", 0.0),
            "message": job_dict.get("message", ""),
            "output_path": job_dict.get("output_path"),
            "metadata_json": json.dumps(job_dict.get("metadata_json")) if job_dict.get("metadata_json") else None,
            "created_at": job_dict.get("created_at", datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat()
        })
    conn.close()

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    res = dict(row)
    if res.get("metadata_json"):
        try:
            res["metadata_json"] = json.loads(res["metadata_json"])
        except Exception:
            pass
    return res

def get_all_jobs() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("metadata_json"):
            try:
                d["metadata_json"] = json.loads(d["metadata_json"])
            except Exception:
                pass
        result.append(d)
    return result

def save_job_slides(job_id: str, slides: List[Dict[str, Any]]):
    conn = get_db()
    with conn:
        conn.execute("DELETE FROM job_slides WHERE job_id = ?", (job_id,))
        for s in slides:
            conn.execute("""
                INSERT INTO job_slides (job_id, slide_id, frame_idx, timestamp, timestamp_sec, quality_score, sharpness, similarity_score, image_path, is_selected, quad_detected)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job_id, s["slide_id"], s["frame_idx"], s["timestamp"], s["timestamp_sec"],
                s["quality_score"], s["sharpness"], s["similarity_score"], s["image_path"],
                1 if s.get("is_selected", True) else 0,
                1 if s.get("quad_detected", False) else 0
            ))
    conn.close()

def get_job_slides(job_id: str) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM job_slides WHERE job_id = ? ORDER BY slide_id ASC", (job_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def index_presentation_slide(doc_name: str, pdf_path: str, slide_num: int, text: str, image_path: str):
    conn = get_db()
    with conn:
        conn.execute("""
            INSERT INTO presentation_search (document_name, pdf_path, slide_number, full_text, image_path)
            VALUES (?, ?, ?, ?, ?)
        """, (doc_name, pdf_path, slide_num, text, image_path))
    conn.close()

def search_presentations(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    safe_query = escape_fts5_query(query)
    if not safe_query:
        conn.close()
        return []

    try:
        cursor.execute("""
            SELECT document_name, pdf_path, slide_number, snippet(presentation_search, 3, '<b>', '</b>', '...', 15) as snippet, full_text, image_path
            FROM presentation_search
            WHERE presentation_search MATCH ?
            LIMIT ?
        """, (safe_query, limit))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        conn.close()
        return []

def update_job_metadata(job_id: str, metadata_updates: Dict[str, Any]):
    job = get_job(job_id)
    if not job:
        return
    meta = job.get("metadata_json") or {}
    meta.update(metadata_updates)
    job["metadata_json"] = meta
    save_job(job)

