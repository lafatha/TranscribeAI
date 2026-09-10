import os
import subprocess
import sys
from pathlib import Path

def package_offline_bundle():
    print("=" * 60)
    print("AIR-GAPPED DEPLOYMENT PACKAGER")
    print("=" * 60)

    bundle_dir = Path(__file__).resolve().parent / "bundle"
    wheels_dir = bundle_dir / "wheels"
    models_dir = bundle_dir / "models"
    
    wheels_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/2] Downloading Python dependency wheels into {wheels_dir}...")
    req_file = Path(__file__).resolve().parent.parent / "backend" / "requirements.txt"
    if req_file.exists():
        subprocess.run([
            sys.executable, "-m", "pip", "download",
            "-r", str(req_file),
            "-d", str(wheels_dir)
        ], check=True)

    print(f"\n[2/2] Downloading local OCR language models into {models_dir}...")
    try:
        import easyocr
        reader = easyocr.Reader(['en', 'id'], download_enabled=True, model_storage_directory=str(models_dir))
        print("EasyOCR models downloaded successfully.")
    except Exception as e:
        print(f"Note: EasyOCR download optional if using PyMuPDF offline fallback: {e}")

    print("\nAir-gapped deployment bundle ready in 'offline/bundle/'.")
    print("Transfer 'offline/bundle/' to your internal air-gapped server.")

if __name__ == "__main__":
    package_offline_bundle()
