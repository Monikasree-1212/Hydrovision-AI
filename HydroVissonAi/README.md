# HYDROVISION AI

### AI-Assisted Dam Inspection & Predictive Maintenance Decision Support System

HydroVision AI is a government-oriented infrastructure monitoring platform for large dams and hydroelectric projects using drone imagery, GPS data, AI defect detection, 3D Digital Twin, GIS visualization, condition scoring, risk engine, predictive maintenance, and ReportLab PDF reporting.

---

## 🏛️ Government Visual Identity

Built using official infrastructure monitoring standards:
- **Primary Navy**: `#12355B`
- **Government Blue**: `#1F4E79`
- **Light Grey**: `#F4F6F8`
- **Dark Text**: `#1F2933`
- **Semantic Indicators**: `#2E7D32` (Green/Safe), `#C98A00` (Amber/Warning), `#B3261E` (Red/Critical)

---

## 👥 Four Primary Portals (RBAC)

1. **AUTHORITY PORTAL**: Multi-dam safety overview, compliance tracking, risk matrix summary, alerts feed.
2. **DAM OPERATOR PORTAL**: Assigned dam health monitoring, inspection schedule, defect overview.
3. **INSPECTION ENGINEER PORTAL**: Drone dataset upload, quality validation, AI defect detection, human-in-the-loop defect verification/editing, condition scoring, PDF report generation, reinspection approval.
4. **MAINTENANCE MANAGER PORTAL**: Risk-based work order creation, repair team assignment, progress tracking, repair evidence, reinspection requests.

---

## 🔄 Complete Operational Loop

```
DRONE CAPTURE → DATA UPLOAD → DATA VALIDATION → AI DETECTION → ENGINEER VERIFICATION → GEO-LOCATION → 3D DIGITAL TWIN → HISTORICAL COMPARISON → CONDITION ASSESSMENT → RISK ASSESSMENT → PREDICTIVE ANALYSIS → MAINTENANCE → REINSPECTION → CLOSURE
```

---

## 🛠️ Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet, Three.js, Lucide Icons, Recharts
- **Backend**: Python FastAPI, SQLAlchemy, Pydantic v2, JWT Auth, ReportLab (PDF)
- **Database**: PostgreSQL + PostGIS (Production) / SQLite (Development Fallback)
- **Storage**: S3 / MinIO Object Storage
- **AI**: YOLO11 (Defect Detection), OpenCV (Measurement Estimates), XGBoost (Deterioration Trend)

---

## 🚀 Running Locally

### Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.
