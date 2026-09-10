import os
import sys
import time
import cv2
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.module1_video.extractor import VideoFrameExtractor
from app.module1_video.deduplicator import process_and_deduplicate_slides
from tests.test_system import create_synthetic_presentation_video

def run_performance_benchmark():
    print("=" * 60)
    print("OFFLINE PRESENTATION PROCESSOR — PERFORMANCE BENCHMARK")
    print("=" * 60)

    benchmark_video = "benchmark_test_video.mp4"
    if not os.path.exists(benchmark_video):
        print("Generating synthetic 4K/HD presentation video for benchmark...")
        create_synthetic_presentation_video(benchmark_video, num_slides=10, fps=30, duration_per_slide_sec=2.0)

    # 1. Measure Video Processing Speed
    t_start = time.time()
    extractor = VideoFrameExtractor(benchmark_video, base_fps=5.0)
    v_info = extractor.get_info()

    frame_stream = list(extractor.extract_sampled_frames(sample_fps=5.0))
    t_extract = time.time() - t_start

    t_dedup_start = time.time()
    slides = process_and_deduplicate_slides(frame_stream, duplicate_threshold=0.75)
    t_dedup = time.time() - t_dedup_start

    t_total = time.time() - t_start
    extractor.close()

    raw_frames = v_info["total_frames"]
    candidate_frames = len(frame_stream)
    unique_slides = len(slides)
    dedup_ratio = (1.0 - (unique_slides / max(1, candidate_frames))) * 100.0
    avg_fps_processed = raw_frames / max(0.001, t_total)

    print(f"\n--- VIDEO PROCESSING RESULTS ---")
    print(f"Video File           : {v_info['source_video']}")
    print(f"Resolution           : {v_info['width']} x {v_info['height']}")
    print(f"Source FPS           : {v_info['fps']}")
    print(f"Video Duration       : {v_info['duration_sec']:.2f} seconds")
    print(f"Raw Video Frames     : {raw_frames}")
    print(f"Sampled Candidates   : {candidate_frames}")
    print(f"Detected Unique Slides: {unique_slides}")
    print(f"Deduplication Ratio  : {dedup_ratio:.2f}%")
    print(f"Frame Extract Time   : {t_extract:.2f}s")
    print(f"Slide Deduplicate Time: {t_dedup:.2f}s")
    print(f"Total Process Time   : {t_total:.2f}s")
    print(f"Processing Throughput: {avg_fps_processed:.1f} FPS")
    print("=" * 60)

    if os.path.exists(benchmark_video):
        os.remove(benchmark_video)

if __name__ == "__main__":
    run_performance_benchmark()
