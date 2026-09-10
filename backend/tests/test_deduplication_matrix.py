import cv2
import numpy as np
import pytest
from app.module1_video.deduplicator import process_and_deduplicate_slides

def generate_mock_frame(text: str, bg_color: tuple) -> np.ndarray:
    img = np.full((360, 640, 3), bg_color, dtype=np.uint8)
    cv2.putText(img, text, (50, 180), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    return img

def test_deduplication_threshold_matrix():
    # 1. Stream of 10 identical frames
    f_identical = generate_mock_frame("Slide A", (180, 40, 40))
    stream_identical = [(i, i * 0.2, f_identical.copy()) for i in range(10)]

    for thresh in [0.70, 0.75, 0.80, 0.85, 0.90]:
        slides = process_and_deduplicate_slides(iter(stream_identical), total_frames_est=10, duplicate_threshold=thresh)
        assert len(slides) == 1, f"Identical frames failed at threshold {thresh}"

    # 2. Stream of 3 distinctly different slides (10 frames each)
    f1 = generate_mock_frame("Slide A", (180, 40, 40))
    f2 = generate_mock_frame("Slide B", (40, 180, 40))
    f3 = generate_mock_frame("Slide C", (40, 40, 180))

    stream_distinct = []
    for i in range(10):
        stream_distinct.append((i, i * 0.2, f1.copy()))
    for i in range(10, 20):
        stream_distinct.append((i, i * 0.2, f2.copy()))
    for i in range(20, 30):
        stream_distinct.append((i, i * 0.2, f3.copy()))

    for thresh in [0.70, 0.75, 0.80, 0.85, 0.90]:
        slides = process_and_deduplicate_slides(iter(stream_distinct), total_frames_est=30, duplicate_threshold=thresh)
        assert len(slides) == 3, f"Distinct slides missed at threshold {thresh}"
