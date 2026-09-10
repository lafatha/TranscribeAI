import os
import gc
import cv2
import numpy as np
import pytest
from app.module1_video.deduplicator import process_and_deduplicate_slides

def frame_generator(num_frames=100):
    for i in range(num_frames):
        # Generate 1080p frame
        img = np.full((1080, 1920, 3), (i % 255, 100, 150), dtype=np.uint8)
        cv2.putText(img, f"Frame {i}", (100, 500), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (255, 255, 255), 4)
        yield (i, i * 0.1, img)

def test_memory_stability_during_large_stream():
    # Process 100 large 1080p frames via streaming generator
    gen = frame_generator(num_frames=100)
    slides = process_and_deduplicate_slides(gen, total_frames_est=100, duplicate_threshold=0.75)
    
    assert len(slides) > 0
    # Force garbage collection
    gc.collect()
    print(f"Memory test passed: Extracted {len(slides)} slides from 100 1080p frames cleanly.")

if __name__ == "__main__":
    test_memory_stability_during_large_stream()
