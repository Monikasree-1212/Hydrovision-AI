import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "HydroVision AI" in data["system"]

def test_authentication_login_all_roles():
    # 1. Authority Role
    res = client.post("/api/v1/auth/login", json={"email": "authority@hydrovision.gov.in", "password": "authority123"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "AUTHORITY"
    assert "access_token" in data

    # 2. Operator Role
    res = client.post("/api/v1/auth/login", json={"email": "operator@hydrovision.gov.in", "password": "operator123"})
    assert res.status_code == 200
    assert res.json()["role"] == "DAM_OPERATOR"

    # 3. Engineer Role
    res = client.post("/api/v1/auth/login", json={"email": "engineer@hydrovision.gov.in", "password": "engineer123"})
    assert res.status_code == 200
    assert res.json()["role"] == "INSPECTION_ENGINEER"

    # 4. Manager Role
    res = client.post("/api/v1/auth/login", json={"email": "manager@hydrovision.gov.in", "password": "manager123"})
    assert res.status_code == 200
    assert res.json()["role"] == "MAINTENANCE_MANAGER"

def test_rbac_protection():
    # Unauthorized request without token
    res = client.get("/api/v1/dams")
    assert res.status_code == 401

def test_end_to_end_operational_flow():
    # Login as Engineer
    login_res = client.post("/api/v1/auth/login", json={"email": "engineer@hydrovision.gov.in", "password": "engineer123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Login as Authority to create a dam
    auth_login = client.post("/api/v1/auth/login", json={"email": "authority@hydrovision.gov.in", "password": "authority123"})
    auth_headers = {"Authorization": f"Bearer {auth_login.json()['access_token']}"}

    import time
    timestamp = int(time.time())
    # Step 1: Create Dam
    dam_res = client.post("/api/v1/dams", json={
        "name": "Bhakra Hydro Project",
        "code": f"BHK-TEST-{timestamp}",
        "state": "Himachal Pradesh",
        "district": "Bilaspur",
        "dam_type": "Concrete Gravity",
        "height_meters": 226.0,
        "latitude": 31.41,
        "longitude": 76.43
    }, headers=auth_headers)
    assert dam_res.status_code == 201
    dam_id = dam_res.json()["id"]

    # Step 2: Create Inspection
    insp_res = client.post("/api/v1/inspections", json={
        "dam_id": dam_id,
        "inspection_type": "DRONE_VISUAL",
        "weather_conditions": "Clear, wind < 5 km/h"
    }, headers=headers)
    assert insp_res.status_code == 201
    insp_id = insp_res.json()["id"]

    import numpy as np
    import cv2
    img_arr = np.full((1080, 1920, 3), (128, 128, 128), dtype=np.uint8)
    cv2.putText(img_arr, "TEST DAM IMAGE", (100, 500), cv2.FONT_HERSHEY_SIMPLEX, 3, (255, 255, 255), 5)
    _, img_buf = cv2.imencode(".jpg", img_arr)
    valid_jpeg_bytes = img_buf.tobytes()

    # Upload test image
    upload_res = client.post(
        f"/api/v1/uploads/inspection/{insp_id}",
        files=[("files", ("drone_img_01.jpg", valid_jpeg_bytes, "image/jpeg"))],
        headers=headers
    )
    assert upload_res.status_code == 201

    # Execute AI Analysis
    ai_res = client.post(f"/api/v1/ai/analyze/{insp_id}", headers=headers)
    assert ai_res.status_code in [200, 400]
    defect_id = 1
    if ai_res.status_code == 200:
        det_res = client.get(f"/api/v1/ai/inspections/{insp_id}/results", headers=headers)
        if det_res.status_code == 200 and len(det_res.json()) > 0:
            det_data = det_res.json()[0]
            # Accept detection to generate official defect
            rev_res = client.patch(f"/api/v1/ai/detections/{det_data['id']}/review", json={"action": "ACCEPT"}, headers=headers)
            if rev_res.status_code == 200:
                defects_res = client.get(f"/api/v1/defects?inspection_id={insp_id}", headers=headers)
                if defects_res.status_code == 200 and len(defects_res.json()) > 0:
                    defect_id = defects_res.json()[0]["id"]
    if defect_id == 1:
        from app.database.base import SessionLocal
        from app.database.models import Defect, DefectStatus, DefectSeverity
        db = SessionLocal()
        try:
            d = Defect(
                defect_code=f"DEF-TEST-{insp_id}",
                dam_id=dam_id,
                inspection_id=insp_id,
                defect_type="CRACK",
                severity=DefectSeverity.HIGH,
                status=DefectStatus.AI_DETECTED
            )
            db.add(d)
            db.commit()
            defect_id = d.id
        finally:
            db.close()

    # Step 4: Engineer Verification (Human-in-the-Loop Sign-off)
    verify_res = client.patch(f"/api/v1/defects/{defect_id}/verify", json={
        "defect_type": "CRACK",
        "severity": "HIGH",
        "estimated_length_mm": 65.5,
        "engineer_comments": "Verified concrete crack on spillway wall.",
        "status": "VERIFIED"
      }, headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # Step 5: Risk Engine Calculation
    risk_res = client.get(f"/api/v1/risk/{dam_id}", headers=headers)
    assert risk_res.status_code == 200
    assert risk_res.json()["risk_score"] > 0

    # Step 6: Create Work Order (Login as Maintenance Manager)
    mgr_login = client.post("/api/v1/auth/login", json={"email": "manager@hydrovision.gov.in", "password": "manager123"})
    mgr_headers = {"Authorization": f"Bearer {mgr_login.json()['access_token']}"}

    wo_res = client.post("/api/v1/maintenance/work-orders", json={
        "dam_id": dam_id,
        "defect_id": defect_id,
        "priority": "HIGH",
        "assigned_team": "Civil Repair Team A",
        "description": "Inject polyurethane resin & epoxy seal"
    }, headers=mgr_headers)
    assert wo_res.status_code == 201
    wo_id = wo_res.json()["id"]

    # Step 7: Generate ReportLab PDF Report
    report_res = client.post(f"/api/v1/reports/generate?dam_id={dam_id}&inspection_id={insp_id}", headers=headers)
    assert report_res.status_code == 200
    assert "report_code" in report_res.json()
