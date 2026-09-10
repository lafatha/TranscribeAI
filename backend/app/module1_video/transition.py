import cv2
import numpy as np

def compute_dhash(image: np.ndarray, hash_size: int = 8) -> int:
    """Compute 64-bit difference hash of image."""
    resized = cv2.resize(image, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
    if len(resized.shape) == 3:
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    else:
        gray = resized
    diff = gray[:, 1:] > gray[:, :-1]
    return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])

def dhash_distance(hash1: int, hash2: int) -> float:
    """Normalized Hamming distance between two 64-bit hashes."""
    x = hash1 ^ hash2
    bit_count = bin(x).count('1')
    return bit_count / 64.0

def compute_hsv_histogram_diff(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute Bhattacharyya distance between HSV color histograms."""
    hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
    hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)
    
    hist1 = cv2.calcHist([hsv1], [0, 1], None, [18, 25], [0, 180, 0, 256])
    hist2 = cv2.calcHist([hsv2], [0, 1], None, [18, 25], [0, 180, 0, 256])
    
    cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
    cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
    
    dist = cv2.compareHist(hist1, hist2, cv2.HISTCMP_BHATTACHARYYA)
    return float(dist)

def compute_ssim_fast(img1: np.ndarray, img2: np.ndarray) -> float:
    """Fast SSIM implementation between two BGR frames."""
    g1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY) if len(img1.shape) == 3 else img1
    g2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY) if len(img2.shape) == 3 else img2
    
    h, w = g1.shape
    if h > 360:
        scale = 360.0 / h
        g1 = cv2.resize(g1, (0, 0), fx=scale, fy=scale)
        g2 = cv2.resize(g2, (0, 0), fx=scale, fy=scale)
        
    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2

    img1 = g1.astype(np.float64)
    img2 = g2.astype(np.float64)
    
    kernel = cv2.getGaussianKernel(11, 1.5)
    window = np.outer(kernel, kernel)

    mu1 = cv2.filter2D(img1, -1, window)
    mu2 = cv2.filter2D(img2, -1, window)

    mu1_sq = mu1 ** 2
    mu2_sq = mu2 ** 2
    mu1_mu2 = mu1 * mu2

    sigma1_sq = cv2.filter2D(img1 ** 2, -1, window) - mu1_sq
    sigma2_sq = cv2.filter2D(img2 ** 2, -1, window) - mu2_sq
    sigma12 = cv2.filter2D(img1 * img2, -1, window) - mu1_mu2

    ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))
    return float(np.mean(ssim_map))

def compute_frame_similarity(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Combined frame similarity score between 0.0 and 1.0.
    Weighted combination of SSIM, Perceptual Hash, and HSV Histogram.
    Applies non-linear transition scaling when structural or color shifts occur.
    """
    if img1.shape != img2.shape:
        img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
        
    ssim_val = compute_ssim_fast(img1, img2)
    hash1 = compute_dhash(img1)
    hash2 = compute_dhash(img2)
    hash_sim = 1.0 - dhash_distance(hash1, hash2)
    
    hist_dist = compute_hsv_histogram_diff(img1, img2)
    hist_sim = max(0.0, 1.0 - hist_dist)
    
    similarity = 0.40 * ssim_val + 0.30 * hash_sim + 0.30 * hist_sim
    
    # Scale down if color shift or SSIM structural change is present
    if hist_dist > 0.25:
        similarity *= max(0.1, (1.0 - hist_dist))
    if ssim_val < 0.85:
        similarity *= max(0.1, ssim_val)

    return float(np.clip(similarity, 0.0, 1.0))
