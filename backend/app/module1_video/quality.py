import cv2
import numpy as np

def compute_sharpness_laplacian(image: np.ndarray) -> float:
    """Laplacian variance measure for focus/sharpness. Higher is sharper."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    val = cv2.Laplacian(gray, cv2.CV_64F).var()
    return float(val)

def compute_tenengrad_gradient(image: np.ndarray) -> float:
    """Tenengrad gradient measure of image sharpness."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(sobelx ** 2 + sobely ** 2)
    return float(np.mean(grad_mag))

def compute_exposure_score(image: np.ndarray) -> float:
    """Exposure quality score between 0.0 and 1.0. Penalty for under/over exposure."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    mean_val = float(np.mean(gray))
    # Ideal mean around 128
    score = 1.0 - abs(mean_val - 128.0) / 128.0
    return max(0.0, float(score))

def compute_contrast_score(image: np.ndarray) -> float:
    """Contrast quality score based on standard deviation of intensity."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    std_val = float(np.std(gray))
    # Ideal std > 40
    score = min(1.0, std_val / 64.0)
    return float(score)

def calculate_frame_quality(image: np.ndarray) -> float:
    """
    Computes a composite frame quality score (0.0 to 1.0)
    balancing sharpness (60%), contrast (20%), exposure (20%).
    """
    lap_var = compute_sharpness_laplacian(image)
    # Normalize laplacian variance (50 = decent, 500+ = very sharp)
    sharpness_score = min(1.0, lap_var / 300.0)
    
    contrast_score = compute_contrast_score(image)
    exposure_score = compute_exposure_score(image)
    
    total_score = 0.60 * sharpness_score + 0.20 * contrast_score + 0.20 * exposure_score
    return float(np.clip(total_score, 0.0, 1.0))
