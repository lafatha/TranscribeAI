# Air-Gapped Offline Deployment Guide

This system is engineered for 100% self-hosted, offline execution without external API dependencies.

---

## 1. Connected Machine Setup (Prepare Bundle)

On a computer with internet access:

```bash
# 1. Clone repository & navigate to offline packager
cd offline

# 2. Download all wheels and model weights
python download_models.py

# 3. Save docker images (Optional)
docker compose build
docker save -o presentation_processor.tar offline-backend offline-frontend
```

Transfer the repository folder and `presentation_processor.tar` via USB / secure media to your air-gapped machine.

---

## 2. Air-Gapped Machine Setup (Deployment)

On your internal, network-disabled server:

### Option A: Running with Docker Compose (Recommended)
```bash
# Load Docker images
docker load -i presentation_processor.tar

# Launch stack
docker compose up -d
```
Access UI at: `http://localhost:3000`

### Option B: Running Bare Metal Python
```bash
# Install pre-downloaded wheels
pip install --no-index --find-links=offline/bundle/wheels -r backend/requirements.txt

# Start backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
