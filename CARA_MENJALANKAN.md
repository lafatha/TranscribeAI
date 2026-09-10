# 🚀 Panduan Eksekusi Sistem: Video Presentasi → PDF Slide & OCR Offline

Panduan ini dibuat agar **siapapun (termasuk AI atau pengguna awam)** bisa langsung paham, menjalankan, dan mengoperasikan sistem ini tanpa kebingungan.

---

## 📌 Apa yang Dilakukan Sistem Ini?

Sistem ini terdiri dari **2 Alat Utama**:

1. **ALAT 1 (Video HP → PDF Slide)**:
   - Memproses video hasil rekaman HP (misal rekaman layar proyektor saat presentasi).
   - Menghapus frame duplikat, memperbaiki kemiringan kamera (koreksi perspektif), memilih gambar paling tajam, dan menghasilkan PDF slide bersih (1 slide = 1 halaman PDF).

2. **ALAT 2 (PDF Slide → OCR & Data Terstruktur)**:
   - Membaca PDF slide tanpa koneksi internet (100% offline).
   - Mengambil judul, teks, tabel, serta gambar grafik/diagram tanpa manipulasi angka (tanpa ilusi/halusinasi AI).
   - Menyediakan pencarian cepat (*Search*) seluruh isi presentasi.

---

## 🛠️ Prasyarat (Persiapan Awal)

Pastikan di komputer sudah terinstall:
- **Python** (Versi 3.10 atau lebih baru)
- **Node.js** (Versi 18 atau lebih baru)

---

## ⚡ Cara Menjalankan Aplikasi (Hanya 2 Langkah Utama)

Buka **Terminal / Command Prompt (CMD)** dan ikuti langkah berikut:

### Langkah 1: Jalankan Backend Server (Python FastAPI)

1. Buka terminal baru dan masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Install pustaka (dependencies) Python:
   ```bash
   python -m pip install -r requirements.txt
   ```
3. Jalankan server Backend:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   > 🟢 *Jika berhasil, akan muncul tulisan: `Application startup complete.` di port `http://localhost:8000`.*

---

### Langkah 2: Jalankan Tampilan Aplikasi / Frontend (Next.js)

1. Buka terminal **baru lagi** (jangan tutup terminal backend), lalu masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Install paket frontend:
   ```bash
   npm install
   ```
3. Jalankan server Frontend:
   ```bash
   npm run dev
   ```
4. Buka browser (Chrome / Edge) dan ketik alamat:
   ```text
   http://localhost:3000
   ```

---

## 🎮 Cara Menggunakan Tampilan Aplikasi (User Workflow)

Setelah membuka `http://localhost:3000`, kamu akan melihat **Dashboard Utama**:

### 1️⃣ Mengubah Video Presentasi HP menjadi PDF Slide (Workflow 1)
- Klik tombol **"Convert Video to PDF"** atau pilih menu **Video → PDF**.
- Tarik (*drag & drop*) file video (`.mp4`, `.mov`, `.mkv`, atau `.avi`).
- Klik tombol **"Convert to Clean Slide PDF"**.
- Tunggu indikator langkah berjalan (`Analyze Video` → `Detect Slides` → `Build PDF`).
- Setelah selesai, kamu bisa review slide (bisa hapus slide duplikat atau ubah urutan).
- Klik **"Download PDF"** untuk mengunduh hasil PDF, atau klik **"Extract Text in Tool 2"** untuk langsung mengirim PDF ke OCR.

### 2️⃣ Mengambil Teks & Tabel dari PDF Slide (Workflow 2)
- Klik tombol **"Extract Text from PDF"** atau pilih menu **PDF → OCR**.
- Tarik file PDF slide yang ingin diekstrak.
- Klik **"Extract Information from PDF"**.
- Setelah selesai, kamu bisa melihat teks presentasi di tab **Text Content**, grafik di tab **Visuals & Charts**, atau mengunduh Markdown dengan tombol **"Download Markdown"**.

### 3️⃣ Mencari Kata Kunci Presentasi (Local Search)
- Pilih menu **Search** di navigasi atas.
- Ketik kata kunci (contoh: `revenue`, `strategi`, `2026`).
- Hasil pencarian akan menampilkan halaman slide mana yang mengandung kata kunci tersebut beserta cuplikan gambarnya.

---

## 🧪 Cara Menjalankan Pengujian & Benchmark

Jika ingin memverifikasi bahwa seluruh sistem berjalan 100% lancar:

### 1. Jalankan Unit Test Otomatis
Di folder utama project, ketik:
```bash
python -m pytest backend/tests/
```
> *Hasil yang diharapkan: `6 passed` (semua pengujian berhasil 100%).*

### 2. Jalankan Benchmark Kecepatan & Memori
Di folder utama project, ketik:
```bash
python backend/tests/benchmark.py
```
> *Ini akan mengukur FPS pemrosesan video dan tingkat reduksi frame duplikat.*

---

## 🔧 Penanganan Masalah (Troubleshooting)

- **Port 8000 sudah terpakai?**
  Jalankan uvicorn di port lain, contoh: `python -m uvicorn app.main:app --port 8050`.
- **Halaman frontend tidak tersambung ke backend?**
  Pastikan terminal backend (Langkah 1) masih menyala dan tidak ditutup.
- **Apakah butuh koneksi internet?**
  Tidak. Sistem ini **100% Offline & Air-Gapped**, semua pemrosesan dilakukan lokal di dalam komputer.
