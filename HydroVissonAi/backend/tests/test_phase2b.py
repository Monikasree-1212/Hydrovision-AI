import io
import time
import json
import pytest
import numpy as np
import cv2
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers(email: str, password: str):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_phase2b_model_status_api():
    headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    res = client.get("/api/v1/ai/model/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "supported_classes" in data
    assert "CRACK" in data["supported_classes"]
    assert "CORROSION" in data["supported_classes"]
    assert "SEEPAGE" in data["supported_classes"]

def test_phase2b_rejected_media_ai_processing_blocked():
    headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")

    # Upload corrupted bytes to produce a REJECTED quality status
    corrupted_bytes = b"CORRUPTED_FILE_DATA_NOT_AN_IMAGE"
    upload_res = client.post(
        "/api/v1/uploads/inspection/1",
        data={"dataset_name": "Phase 2B Eligibility Test"},
        files=[("files", ("rejected_test.jpg", corrupted_bytes, "image/jpeg"))],
        headers=headers
    )
    assert upload_res.status_code == 201
    media = upload_res.json()["images"][0]
    assert media["quality_status"] == "REJECTED"

    # Attempting AI analysis on REJECTED media must fail with 400 Bad Request
    ai_res = client.post(f"/api/v1/ai/media/{media['id']}/analyze", headers=headers)
    assert ai_res.status_code == 400
    assert "REJECTED" in ai_res.json()["detail"]

def test_phase2b_human_in_the_loop_review_and_data_preservation():
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")

    # 1. Upload valid image first
    img_array = np.full((1080, 1920, 3), (150, 150, 150), dtype=np.uint8)
    cv2.putText(img_array, "PHASE 2B REVIEW TEST", (100, 500), cv2.FONT_HERSHEY_SIMPLEX, 3, (255, 255, 255), 5)
    _, buffer = cv2.imencode(".jpg", img_array)
    valid_bytes = buffer.tobytes()

    upload_res = client.post(
        "/api/v1/uploads/inspection/1",
        data={"dataset_name": "Phase 2B Review Batch"},
        files=[("files", ("valid_review_target.jpg", valid_bytes, "image/jpeg"))],
        headers=engineer_headers
    )
    assert upload_res.status_code == 201
    media = upload_res.json()["images"][0]

    # Create a test AIDetection record directly via DB context for review testing
    from app.database.base import SessionLocal
    from app.database.models import AIDetection, Inspection

    db = SessionLocal()
    try:
        insp = db.query(Inspection).filter(Inspection.id == 1).first()
        det_code = f"DET-TEST-{int(time.time() * 1000)}"
        det = AIDetection(
            detection_code=det_code,
            inspection_id=1,
            media_id=media["id"],
            image_id=media["id"],
            dam_id=insp.dam_id,
            defect_type="CRACK",
            confidence=0.89,
            bbox_x_min=120.0,
            bbox_y_min=250.0,
            bbox_x_max=470.0,
            bbox_y_max=580.0,
            original_defect_type="CRACK",
            original_confidence=0.89,
            original_bbox=json.dumps([120.0, 250.0, 470.0, 580.0]),
            model_name="yolo11_dam_defects.pt",
            model_version="1.0.0",
            review_status="AI_DETECTED"
        )
        db.add(det)
        db.commit()
        db.refresh(det)
        det_id = det.id
    finally:
        db.close()

    # 2. Test ACCEPT Action by Engineer
    accept_res = client.patch(
        f"/api/v1/ai/detections/{det_id}/review",
        json={
            "action": "ACCEPT",
            "severity": "HIGH",
            "engineer_comments": "Crack verified on main dam spillway structure."
        },
        headers=engineer_headers
    )
    assert accept_res.status_code == 200
    acc_data = accept_res.json()
    assert acc_data["review_status"] == "ACCEPTED"
    assert acc_data["original_defect_type"] == "CRACK"
    assert acc_data["original_confidence"] == 0.89

    # Verify engineering Defect record was created
    defects_res = client.get("/api/v1/defects", headers=engineer_headers)
    assert defects_res.status_code == 200
    defects = defects_res.json()
    verified_def = next((d for d in defects if d.get("ai_detection_id") == det_id or d.get("source_detection_id") == det_id), None)
    assert verified_def is not None
    assert verified_def["defect_type"] == "CRACK"
    assert verified_def["severity"] == "HIGH"

    # 3. Test EDIT Action by Engineer (Data Preservation Check)
    edit_res = client.patch(
        f"/api/v1/ai/detections/{det_id}/review",
        json={
            "action": "EDIT",
            "defect_type": "CORROSION",
            "severity": "CRITICAL",
            "bbox_x_min": 130.0,
            "bbox_y_min": 260.0,
            "bbox_x_max": 480.0,
            "bbox_y_max": 590.0,
            "engineer_comments": "Re-classified from crack to surface corrosion after visual inspection."
        },
        headers=engineer_headers
    )
    assert edit_res.status_code == 200
    edit_data = edit_res.json()
    assert edit_data["review_status"] == "EDITED"
    assert edit_data["final_defect_type"] == "CORROSION"
    assert edit_data["original_defect_type"] == "CRACK"  # Original AI class preserved!
    assert edit_data["original_confidence"] == 0.89      # Original AI confidence preserved!

    # 4. Test REJECT Action by Engineer
    reject_res = client.patch(
        f"/api/v1/ai/detections/{det_id}/review",
        json={
            "action": "REJECT",
            "engineer_comments": "False positive caused by surface water stain shadow."
        },
        headers=engineer_headers
    )
    assert reject_res.status_code == 200
    rej_data = reject_res.json()
    assert rej_data["review_status"] == "REJECTED"

def test_phase2b_review_rbac_enforcement():
    operator_headers = get_auth_headers("operator@hydrovision.gov.in", "operator123")
    authority_headers = get_auth_headers("authority@hydrovision.gov.in", "authority123")
    manager_headers = get_auth_headers("manager@hydrovision.gov.in", "manager123")
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")

    # Create dummy detection for RBAC testing
    from app.database.base import SessionLocal
    from app.database.models import AIDetection, Inspection

    db = SessionLocal()
    try:
        insp = db.query(Inspection).filter(Inspection.id == 1).first()
        det = AIDetection(
            detection_code=f"DET-RBAC-{int(time.time() * 1000)}",
            inspection_id=1,
            media_id=1,
            image_id=1,
            dam_id=insp.dam_id,
            defect_type="SEEPAGE",
            confidence=0.85,
            bbox_x_min=100.0,
            bbox_y_min=100.0,
            bbox_x_max=200.0,
            bbox_y_max=200.0,
            review_status="AI_DETECTED"
        )
        db.add(det)
        db.commit()
        db.refresh(det)
        det_id = det.id
    finally:
        db.close()

    # Operator CANNOT review AI detections (HTTP 403)
    op_res = client.patch(f"/api/v1/ai/detections/{det_id}/review", json={"action": "ACCEPT"}, headers=operator_headers)
    assert op_res.status_code == 403

    # Authority CANNOT review AI detections (HTTP 403)
    auth_res = client.patch(f"/api/v1/ai/detections/{det_id}/review", json={"action": "ACCEPT"}, headers=authority_headers)
    assert auth_res.status_code == 403

    # Maintenance Manager CANNOT review AI detections (HTTP 403)
    mgr_res = client.patch(f"/api/v1/ai/detections/{det_id}/review", json={"action": "ACCEPT"}, headers=manager_headers)
    assert mgr_res.status_code == 403

    # Inspection Engineer CAN review AI detections (HTTP 200)
    eng_res = client.patch(f"/api/v1/ai/detections/{det_id}/review", json={"action": "ACCEPT"}, headers=engineer_headers)
    assert eng_res.status_code == 200
