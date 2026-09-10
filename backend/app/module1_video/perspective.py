import cv2
import numpy as np
from typing import Tuple, Optional

def order_points(pts: np.ndarray) -> np.ndarray:
    """Order 4 points: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    
    # top-left point has smallest sum, bottom-right has largest sum
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    # top-right point has smallest difference, bottom-left has largest difference
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]

    return rect

def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """Warp quadrilateral region in image into rectified rectangle."""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Compute width of new image
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    # Compute height of new image
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    # Enforce standard presentation aspect ratio (16:9) if output dimensions are reasonably close
    target_width = maxWidth
    target_height = maxHeight
    
    # Destination points
    dst = np.array([
        [0, 0],
        [target_width - 1, 0],
        [target_width - 1, target_height - 1],
        [0, target_height - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (target_width, target_height))
    return warped

def detect_presentation_quad(image: np.ndarray) -> Tuple[Optional[np.ndarray], bool]:
    """
    Detect presentation screen quad.
    Returns (contour_points, confidence_success).
    If quad confidence is low, returns (None, False) to fall back gracefully.
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Bilateral filter to preserve edges
    filtered = cv2.bilateralFilter(blurred, 9, 75, 75)
    edged = cv2.Canny(filtered, 30, 150)

    # Find contours
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    for c in contours:
        area = cv2.contourArea(c)
        if area < (h * w * 0.15): # Screen must occupy at least 15% of frame
            continue
            
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        if len(approx) == 4:
            pts = approx.reshape(4, 2)
            # Verify convex quad
            if cv2.isContourConvex(approx):
                return pts, True

    return None, False

def process_frame_perspective(image: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    Attempts screen detection and 4-point perspective warp.
    Falls back gracefully with crop margins if screen quad detection fails.
    """
    pts, success = detect_presentation_quad(image)
    if success and pts is not None:
        try:
            rectified = four_point_transform(image, pts)
            return rectified, True
        except Exception:
            pass
            
    # Fallback: crop slight outer margins to remove surrounding bezels/borders safely
    h, w = image.shape[:2]
    margin_y = int(h * 0.02)
    margin_x = int(w * 0.02)
    cropped = image[margin_y:h - margin_y, margin_x:w - margin_x]
    return cropped, False
