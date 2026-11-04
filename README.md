# 🫁 Easy X-Ray — AI Clinical Diagnostic & Multi-Role Healthcare Platform

**Easy X-Ray** is an advanced AI-powered medical diagnostic and patient management system designed for **Clinicians**, **Patients**, and **Hospital Administrators**. It provides automated chest radiograph triage, multi-class classification (**COVID-19**, **Normal**, **Pneumonia**), visual explainability via **Grad-CAM**, official medical PDF report generation, and dedicated role-based portals.

---

## ⚡ Tech Stack & Architecture

- **Frontend**: **React 19**, **Vite**, **React Router 7**, **Recharts**, **Lucide Icons**, Modern Cyber-Medical Dark Theme with responsive glassmorphism.
- **Backend**: **Django 5.x**, **Django REST Framework (DRF)**, Django CORS Headers, SQLite.
- **AI / Deep Learning**: **PyTorch**, **ResNet-50** Transfer Learning Architecture, **Grad-CAM** (Gradient-weighted Class Activation Mapping) for explainable heatmap overlays, binary Gatekeeper Chest X-Ray validator.
- **Reporting Engine**: **ReportLab** generating printable clinical diagnostic PDF reports with hospital branding, patient demographics, side-by-side radiograph comparisons, and multi-class probability metrics.

---

## 👥 Multi-Role Access Control

Easy X-Ray features three specialized, tailor-made portals:

| Role | Access Scope | Key Capabilities |
|---|---|---|
| **🩺 Doctor / Clinician** | Clinical Triage & Diagnosis | • Upload & analyze DICOM/PNG/JPG radiographs<br>• Real-time Grad-CAM visual attention heatmaps<br>• Register and manage patient records<br>• Review diagnosis probabilities & write clinical notes<br>• Generate and sign official PDF diagnostic reports |
| **👤 Patient Portal** | Personal Health Records | • Personalized greeting & health profile overview<br>• View personal X-Ray scans & Grad-CAM findings<br>• 1-Click download of official PDF diagnostic reports<br>• Emergency contact & vital statistics info<br>• Privacy protection (no access to clinical tools or other patients) |
| **🛡️ Administrator** | System & AI Operations | • AI inference telemetry & model health monitoring (38ms latency, 95.4% benchmark)<br>• Staff directory & role permission management<br>• Real-time security & audit trail stream<br>• Class-wise model performance benchmarks (F1-score, Precision, Recall) |

---

## ⚙️ Profile Management, Settings & Authentication

- **Profile Dropdown**: Click the user avatar in the top header to view the account card, current role badge, and email.
- **Instant Role Switcher**: Seamlessly toggle between **Doctor**, **Patient**, and **Admin** portals directly from the profile dropdown for testing and review.
- **Settings & Preferences Modal**:
  - **Profile Tab**: Edit display name, email, title, and medical department.
  - **AI & Diagnostics Tab**: Adjust minimum AI confidence threshold (50% - 95%), select Grad-CAM heatmap colormaps (*Jet*, *Turbo*, *Inferno*, *Viridis*), and configure triage alert dispatching.
  - **Hospital & System Tab**: Update healthcare facility name, division info, and view neural engine diagnostics.
- **Log Out**: Securely sign out to a dedicated multi-role authentication screen with 1-click quick login or credentials.

---

## 🚀 Quick Start Guide

### 1. Launch with One Click (Windows)
Double-click:
```bat
start_dev.bat
```
*Starts Django API on `http://localhost:8000` and Vite Frontend on `http://localhost:5173`.*

---

### 2. Manual Startup

#### Backend Setup (Django REST API)
```bash
cd easy_xray
python manage.py migrate
python seed_demo_data.py   # Seeds demo patients and clinical scans
python manage.py runserver 8000
```

#### Frontend Setup (React + Vite)
```bash
cd easy_xray/frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 📁 Repository Structure (Clean Git Layout)

```
easy_xray/
├── easyxray/               <- Django project configuration & settings
├── xrayapp/                <- REST API, PyTorch ML inference, Grad-CAM, & PDF generator
│   ├── models.py           <- Patient & XRayScan database models
│   ├── views.py            <- DRF API endpoints (Dashboard, Scans, Patients)
│   ├── ml_model.py         <- ResNet-50 inference & Grad-CAM engine
│   ├── pdf_generator.py    <- ReportLab clinical report generation
│   └── serializers.py      <- DRF serializers
├── frontend/               <- React 19 + Vite frontend application
│   ├── src/
│   │   ├── context/        <- AuthContext (Doctor, Patient, Admin roles & persistence)
│   │   ├── components/     <- SettingsModal, Header, Sidebar
│   │   ├── pages/          <- Dashboard, PatientPortal, AdminDashboard, UploadScan, etc.
│   │   └── api.js          <- Axios API client
│   └── package.json
├── models/                 <- Pretrained PyTorch weight checkpoints & README
├── sample_scans/           <- Sample radiographs for testing
├── seed_demo_data.py       <- CLI script to populate clinical database
├── train.py                <- PyTorch training script for ResNet-50
├── train_detector.py       <- Gatekeeper chest X-ray classifier training script
├── thoracic_disease_classification/ <- Multi-Label Thoracic Disease & Correlation Modeling
│   ├── src/
│   │   ├── compare_models.py <- Benchmark evaluation across architectures
│   │   ├── dataset.py        <- NIH Chest X-Ray multi-label dataset loader
│   │   ├── evaluate.py       <- Multi-label metrics (ROC-AUC, F1, Hamming Loss)
│   │   ├── models.py         <- Binary Relevance, GCN, & Attention model architectures
│   │   ├── preprocess.py     <- Label correlation matrix & graph adjacency builder
│   │   ├── train.py          <- Multi-label model training pipeline
│   │   └── utils.py          <- Checkpointing & visualization utilities
│   ├── requirements.txt      <- ML dependencies
│   └── README.md             <- Research documentation
├── manage.py               <- Django CLI
└── start_dev.bat           <- Development launcher
```

---

## 🧠 Multi-Label Thoracic Disease Research & Training

The repository includes complete research implementations for 14-disease multi-label thoracic classification with label dependency modeling:
- **Binary Relevance (BR)**: Baseline independent binary classifiers for each finding.
- **Graph Convolutional Networks (GCN)**: Models co-occurrence topology via graph convolutions over correlation adjacency.
- **Attention-Based Modeling**: Self-attention over label embeddings for joint finding reasoning.

```bash
# Run Multi-Label Training
python thoracic_disease_classification/src/train.py --model br
python thoracic_disease_classification/src/train.py --model gcn
python thoracic_disease_classification/src/train.py --model attention

# Benchmark & Compare Models
python thoracic_disease_classification/src/compare_models.py
```
```

---

## 🧠 AI Model Training & Inference

To train custom models on chest X-ray datasets (e.g. NIH ChestX-ray14 or COVID-19 Radiography Database):

```bash
# Train ResNet-50 3-Class Diagnostic Model
python train.py --epochs 15 --batch_size 32

# Train Chest X-Ray Gatekeeper Detector
python train_detector.py --epochs 5 --batch_size 16
```

---

## 📄 License & Attribution
Developed for healthcare diagnostics research. AI predictions are designed to assist medical practitioners and should be corroborated with clinical evaluations.
