import os
import shutil
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple, Generator, Callable

from app.module1_video.transition import compute_frame_similarity
from app.module1_video.quality import calculate_frame_quality, compute_sharpness_laplacian
from app.module1_video.perspective import process_frame_perspective
from app.config import CROPS_DIR

def format_timestamp(seconds: float) -> str:
    """Format seconds into HH:MM:SS.mmm string."""
    mins, secs = divmod(seconds, 60)
    hours, mins = divmod(mins, 60)
    millis = int((secs - int(secs)) * 1000)
    return f"{int(hours):02d}:{int(mins):02d}:{int(secs):02d}.{millis:03d}"

def extract_comparison_crop(frame: np.ndarray, target_w: int = 360, target_h: int = 202) -> np.ndarray:
    """
    Extracts central presentation screen region and resizes to lightweight 360x202 array
    to optimize RAM usage during large video deduplication.
    """
    h, w = frame.shape[:2]
    cy1, cy2 = int(h * 0.10), int(h * 0.90)
    cx1, cx2 = int(w * 0.10), int(w * 0.90)
    cropped = frame[cy1:cy2, cx1:cx2]
    return cv2.resize(cropped, (target_w, target_h), interpolation=cv2.INTER_AREA)

def process_and_deduplicate_slides(
    frame_stream: Generator[Tuple[int, float, np.ndarray], None, None],
    total_frames_est: int = 0,
    duplicate_threshold: float = 0.75,
    progress_callback: Callable = None,
    check_cancelled: Callable[[], bool] = None
) -> List[Dict[str, Any]]:
    """
    Memory-efficient streaming deduplication engine.
    Processes frames incrementally without holding uncompressed full-res arrays in RAM.
    """
    clusters: List[List[Dict[str, Any]]] = []
    processed_count = 0

    for frame_idx, timestamp_sec, frame in frame_stream:
        # Check active cancellation signal
        if check_cancelled and check_cancelled():
            raise InterruptedError("Job cancelled by user during slide extraction")

        processed_count += 1
        if progress_callback and total_frames_est > 0:
            progress_callback(
                0.15 + 0.65 * min(1.0, processed_count / max(1, total_frames_est)),
                f"Analyzing frame {processed_count}/{total_frames_est} (Slide {len(clusters)} detected)..."
            )

        crop_comp = extract_comparison_crop(frame)
        quality_score = calculate_frame_quality(crop_comp)
        sharpness = compute_sharpness_laplacian(crop_comp)

        # Lightweight metadata (does NOT hold full frame in RAM unless candidate)
        frame_meta = {
            "frame_idx": frame_idx,
            "timestamp_sec": timestamp_sec,
            "timestamp": format_timestamp(timestamp_sec),
            "quality_score": quality_score,
            "sharpness": sharpness,
            "crop_comp": crop_comp,
            "full_frame": frame  # Transient reference
        }

        if not clusters:
            clusters.append([frame_meta])
            continue

        # Compare against active cluster representative crop
        last_cluster = clusters[-1]
        cluster_rep = max(last_cluster, key=lambda f: f["quality_score"])
        
        sim = compute_frame_similarity(cluster_rep["crop_comp"], crop_comp)

        if sim >= duplicate_threshold:
            # Same slide -> append to current cluster, drop previous non-winning full_frame
            prev_winner = max(last_cluster, key=lambda f: f["quality_score"])
            if frame_meta["quality_score"] > prev_winner["quality_score"]:
                # New frame is sharper -> release previous full_frame array
                prev_winner["full_frame"] = None
            else:
                # Current frame is lower quality -> release full_frame array immediately
                frame_meta["full_frame"] = None
            last_cluster.append(frame_meta)
        else:
            # New slide transition detected! Release non-winning full_frame arrays in last cluster
            prev_winner = max(last_cluster, key=lambda f: f["quality_score"])
            for item in last_cluster:
                if item is not prev_winner:
                    item["full_frame"] = None
            clusters.append([frame_meta])

    # Select best candidate frame per cluster & apply perspective warp
    results = []
    job_crop_dir = CROPS_DIR
    job_crop_dir.mkdir(parents=True, exist_ok=True)

    for slide_id, cluster in enumerate(clusters, start=1):
        if check_cancelled and check_cancelled():
            raise InterruptedError("Job cancelled during perspective warp")

        best_frame_data = max(cluster, key=lambda f: f["quality_score"])
        best_frame = best_frame_data["full_frame"]

        if best_frame is None:
            # Re-read if released (safeguard fallback)
            best_frame = cv2.cvtColor(best_frame_data["crop_comp"], cv2.COLOR_BGR2RGB)

        rectified_frame, quad_detected = process_frame_perspective(best_frame)

        # Cap resolution to max 1920x1080 (1080p)
        h, w = rectified_frame.shape[:2]
        if w > 1920 or h > 1080:
            scale = min(1920.0 / w, 1080.0 / h)
            new_w = max(1, int(w * scale))
            new_h = max(1, int(h * scale))
            rectified_frame = cv2.resize(rectified_frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

        filename = f"slide_{slide_id:03d}_frame_{best_frame_data['frame_idx']}.jpg"
        save_path = str(job_crop_dir / filename)
        cv2.imwrite(save_path, rectified_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])

        sim_to_rep = 1.0
        if len(cluster) > 1:
            sim_to_rep = compute_frame_similarity(best_frame_data["crop_comp"], cluster[0]["crop_comp"])

        results.append({
            "slide_id": slide_id,
            "frame_idx": best_frame_data["frame_idx"],
            "timestamp": best_frame_data["timestamp"],
            "timestamp_sec": best_frame_data["timestamp_sec"],
            "quality_score": round(best_frame_data["quality_score"], 3),
            "sharpness": round(best_frame_data["sharpness"], 2),
            "similarity_score": round(sim_to_rep, 3),
            "image_path": save_path,
            "is_selected": True,
            "quad_detected": quad_detected
        })

        # Clear memory
        best_frame_data["full_frame"] = None

    return results
