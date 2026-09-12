import re
import random
from typing import List, Dict, Any, Optional, Set
from pathlib import Path
import fitz  # PyMuPDF

DEFAULT_STOPWORDS: Set[str] = {
    "yang", "di", "dan", "ke", "dari", "ini", "itu", "pada", "dengan", "untuk",
    "adalah", "sebagai", "atau", "juga", "akan", "bisa", "ada", "karena", "oleh",
    "dalam", "saat", "mereka", "kita", "kamu", "saya", "ia", "dia", "nya",
    "the", "a", "an", "and", "or", "but", "if", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been", "it",
    "this", "that", "as", "at", "by", "for", "from", "in", "into", "of", "off",
    "on", "onto", "out", "over", "to", "up", "with"
}

def analyze_pdf_keyword_counter(
    pdf_path: str,
    min_frequency: int = 1,
    min_word_length: int = 2,
    exclude_stopwords: bool = False,
    include_phrases: bool = True
) -> Dict[str, Any]:
    """
    Scans full PDF text layer, counts word & phrase frequencies across all pages,
    and returns copyable semicolon-separated string format (without numbers) and detailed stats.
    """
    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    word_freq: Dict[str, int] = {}
    word_pages: Dict[str, Set[int]] = {}
    total_words_scanned = 0

    for p_idx in range(total_pages):
        page_num = p_idx + 1
        page = doc[p_idx]
        raw_text = page.get_text("text")
        if not raw_text:
            continue

        clean_text = raw_text.lower()
        clean_text = re.sub(r'[^a-z0-9\s\-]', ' ', clean_text)
        tokens = [t.strip('-') for t in clean_text.split() if t.strip('-')]

        total_words_scanned += len(tokens)

        # Single word tokens
        for t in tokens:
            if len(t) < min_word_length:
                continue
            if exclude_stopwords and t in DEFAULT_STOPWORDS:
                continue

            word_freq[t] = word_freq.get(t, 0) + 1
            if t not in word_pages:
                word_pages[t] = set()
            word_pages[t].add(page_num)

        # 2-word phrase n-grams if enabled
        if include_phrases and len(tokens) >= 2:
            for i in range(len(tokens) - 1):
                t1, t2 = tokens[i], tokens[i + 1]
                if len(t1) < min_word_length or len(t2) < min_word_length:
                    continue
                if exclude_stopwords and (t1 in DEFAULT_STOPWORDS and t2 in DEFAULT_STOPWORDS):
                    continue

                phrase = f"{t1} {t2}"
                word_freq[phrase] = word_freq.get(phrase, 0) + 1
                if phrase not in word_pages:
                    word_pages[phrase] = set()
                word_pages[phrase].add(page_num)

    doc.close()

    # Filter items by min_frequency
    filtered_items = [
        (word, count) for word, count in word_freq.items() if count >= min_frequency
    ]

    # Sort by frequency count descending, then word length descending, then alphabetical
    filtered_items.sort(key=lambda x: (x[1], len(x[0]), x[0]), reverse=True)

    keywords_list = []
    semicolon_words = []

    for word, count in filtered_items:
        pages_set = word_pages.get(word, set())
        keywords_list.append({
            "word": word,
            "count": count,
            "pages_count": len(pages_set),
            "pages": sorted(list(pages_set))
        })
        semicolon_words.append(word)

    # Shuffle semicolon list to prevent revealing frequency order when copied
    random.shuffle(semicolon_words)
    semicolon_formatted = ";".join(semicolon_words)

    return {
        "total_words_scanned": total_words_scanned,
        "unique_words_count": len(filtered_items),
        "semicolon_formatted": semicolon_formatted,
        "keywords": keywords_list
    }
