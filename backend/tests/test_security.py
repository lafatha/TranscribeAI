import pytest
from app.config import sanitize_filename
from app.database import escape_fts5_query

def test_sanitize_filename():
    # 1. Path traversal attack
    bad1 = "../../etc/passwd"
    safe1 = sanitize_filename(bad1)
    assert ".." not in safe1
    assert "/" not in safe1
    assert "\\" not in safe1
    assert safe1.endswith("passwd")

    # 2. Windows relative path attack
    bad2 = "..\\..\\Windows\\System32\\cmd.exe"
    safe2 = sanitize_filename(bad2)
    assert ".." not in safe2
    assert "\\" not in safe2
    assert safe2.endswith("cmd.exe")

    # 3. Special characters & spaces
    bad3 = "My Secret Presentation (2026) #1!.mp4"
    safe3 = sanitize_filename(bad3)
    assert "(" not in safe3
    assert "#" not in safe3
    assert "!" not in safe3
    assert safe3.endswith(".mp4")

    # 4. Empty or dot-only filename
    bad4 = "..."
    safe4 = sanitize_filename(bad4)
    assert len(safe4) > 5

def test_escape_fts5_query():
    # 1. Special operators and code symbols
    q1 = "c++ program (x + y) * 100%"
    escaped1 = escape_fts5_query(q1)
    assert "(" not in escaped1
    assert "+" not in escaped1
    assert "%" not in escaped1
    assert '"c"*' in escaped1
    assert '"program"*' in escaped1

    # 2. SQL / FTS keywords
    q2 = "revenue OR acquisition AND NOT strategy"
    escaped2 = escape_fts5_query(q2)
    assert '"revenue"*' in escaped2
    assert '"acquisition"*' in escaped2

    # 3. Empty or punctuation query
    q3 = "!!! ???"
    escaped3 = escape_fts5_query(q3)
    assert escaped3 == ""
