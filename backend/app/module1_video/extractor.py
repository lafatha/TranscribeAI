import cv2
import numpy as np
from typing import Generator, Tuple, Dict, Any

class VideoFrameExtractor:
    def __init__(self, video_path: str, base_fps: float = 5.0):
        self.video_path = video_path
        self.base_fps = base_fps
        self.cap = cv2.VideoCapture(video_path)
        if not self.cap.isOpened():
            raise ValueError(f"Unable to open video file: {video_path}")
        
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.fps = float(self.cap.get(cv2.CAP_PROP_FPS)) or 30.0
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.duration_sec = self.total_frames / self.fps if self.fps > 0 else 0

    def get_info(self) -> Dict[str, Any]:
        return {
            "source_video": self.video_path,
            "width": self.width,
            "height": self.height,
            "fps": self.fps,
            "total_frames": self.total_frames,
            "duration_sec": self.duration_sec
        }

    def extract_sampled_frames(self, sample_fps: float = None) -> Generator[Tuple[int, float, np.ndarray], None, None]:
        """
        Yields (frame_index, timestamp_seconds, frame_bgr) incrementally.
        Sample rate defaults to self.base_fps.
        """
        target_fps = sample_fps if sample_fps else self.base_fps
        step = max(1, int(round(self.fps / target_fps)))
        
        frame_idx = 0
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        while True:
            ret, frame = self.cap.read()
            if not ret or frame is None:
                break
            
            if frame_idx % step == 0:
                timestamp_sec = frame_idx / self.fps
                yield frame_idx, timestamp_sec, frame
            
            frame_idx += 1

    def close(self):
        if self.cap:
            self.cap.release()
