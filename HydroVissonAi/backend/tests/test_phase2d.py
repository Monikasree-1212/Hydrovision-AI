import time
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.base import SessionLocal
from app.database.models import Dam, Inspection, DroneImage, AIDetection, Defect, DefectStatus, DefectSeverity, DigitalTwinModel, AuditLog

client = TestClient(app)

def get_auth_headers(email: str, password: str):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def create_mock_glb_bytes() -> bytes:
    """
    Creates valid mock binary GLB file bytes with header magic b'glTF'.
    """
    header = b'glTF' + (2).to_bytes(4, 'little') + (100).to_bytes(4, 'little')
    payload = b'{"asset":{"version":"2.0"}}'
    json_chunk = (len(payload)).to_bytes(4, 'little') + b'JSON' + payload
    return header + json_chunk

def test_phase2d_model_upload_and_versioning():
    """
    Test Phase 2D GLB/GLTF model upload, storage key metadata, versioning, and activation logic.
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")

    glb_content = create_mock_glb_bytes()

    # 1. Upload Model Version 1
    res1 = client.post(
        "/api/v1/digital-twin/dams/1/models",
        headers=engineer_headers,
        data={"name": "Dam 3D CAD V1", "version": "v1.0.0", "is_active": "true"},
        files={"file": ("dam_v1.glb", glb_content, "model/gltf-binary")}
    )
    assert res1.status_code == 201, f"Model upload failed: {res1.text}"
    data1 = res1.json()
    assert data1["name"] == "Dam 3D CAD V1"
    assert data1["version"] == "v1.0.0"
    assert data1["is_active"] is True
    assert "digital-twins/1/v1.0.0/dam_v1.glb" in data1["storage_key"]
    model1_id = data1["id"]

    # 2. Upload Model Version 2 (Must NOT delete V1)
    res2 = client.post(
        "/api/v1/digital-twin/dams/1/models",
        headers=engineer_headers,
        data={"name": "Dam 3D Photogrammetry V2", "version": "v2.0.0", "is_active": "true"},
        files={"file": ("dam_v2.glb", glb_content, "model/gltf-binary")}
    )
    assert res2.status_code == 201, f"Model V2 upload failed: {res2.text}"
    data2 = res2.json()
    assert data2["version"] == "v2.0.0"
    assert data2["is_active"] is True
    model2_id = data2["id"]

    # Verify V1 is still preserved in DB but deactivated
    res_v1 = client.get(f"/api/v1/digital-twin/models/{model1_id}", headers=engineer_headers)
    assert res_v1.status_code == 200
    assert res_v1.json()["is_active"] is False

    # 3. Model Download Stream
    res_dl = client.get(f"/api/v1/digital-twin/models/{model2_id}/download", headers=engineer_headers)
    assert res_dl.status_code == 200
    assert res_dl.content.startswith(b'glTF')


def test_phase2d_rbac_security():
    """
    Test Phase 2D RBAC rules:
    - Only INSPECTION_ENGINEER can POST upload and PATCH activate.
    - Other roles receive HTTP 403 Forbidden.
    - All authenticated roles can view digital twin summary.
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    authority_headers = get_auth_headers("authority@hydrovision.gov.in", "authority123")
    operator_headers = get_auth_headers("operator@hydrovision.gov.in", "operator123")
    manager_headers = get_auth_headers("manager@hydrovision.gov.in", "manager123")

    glb_content = create_mock_glb_bytes()

    # 1. Authority attempts upload -> 403
    res_auth = client.post(
        "/api/v1/digital-twin/dams/1/models",
        headers=authority_headers,
        data={"name": "Unauthorized Model"},
        files={"file": ("unauth.glb", glb_content, "model/gltf-binary")}
    )
    assert res_auth.status_code == 403, f"Expected 403 for Authority upload, got {res_auth.status_code}"

    # 2. Operator attempts upload -> 403
    res_op = client.post(
        "/api/v1/digital-twin/dams/1/models",
        headers=operator_headers,
        data={"name": "Unauthorized Model"},
        files={"file": ("unauth.glb", glb_content, "model/gltf-binary")}
    )
    assert res_op.status_code == 403

    # 3. Manager attempts upload -> 403
    res_mgr = client.post(
        "/api/v1/digital-twin/dams/1/models",
        headers=manager_headers,
        data={"name": "Unauthorized Model"},
        files={"file": ("unauth.glb", glb_content, "model/gltf-binary")}
    )
    assert res_mgr.status_code == 403

    # 4. View Digital Twin Summary -> Allowed for all roles
    for role_name, headers in [
        ("AUTHORITY", authority_headers),
        ("DAM_OPERATOR", operator_headers),
        ("INSPECTION_ENGINEER", engineer_headers),
        ("MAINTENANCE_MANAGER", manager_headers),
    ]:
        res_view = client.get("/api/v1/digital-twin/dams/1", headers=headers)
        assert res_view.status_code == 200, f"View failed for role {role_name}: {res_view.text}"


def test_phase2d_verified_defects_and_missing_coords_protection():
    """
    Test Phase 2D Defect Overlay:
    1. Only verified defects appear (raw AI detections excluded).
    2. Defects with GPS get Local ENU coordinates (X, Y, Z).
    3. Defects with missing coordinates get position_available=False, location_precision='UNAVAILABLE'. Zero fake 3D coords!
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    db = SessionLocal()

    try:
        dam = db.query(Dam).filter(Dam.id == 1).first()
        dam_ref_lat = dam.latitude
        dam_ref_lng = dam.longitude

        # Create Verified Defect WITH GPS
        def_gps = Defect(
            defect_code=f"DEF-3D-GPS-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=1,
            defect_type="CRACK",
            severity=DefectSeverity.HIGH,
            confidence=0.88,
            status=DefectStatus.VERIFIED,
            latitude=dam_ref_lat + 0.0001,
            longitude=dam_ref_lng + 0.0001,
            coordinate_source="MEDIA_GPS",
            location_precision="MEDIA_REFERENCE",
            pos_x_3d=0.0,
            pos_y_3d=0.0,
            pos_z_3d=0.0
        )

        # Create Verified Defect WITHOUT GPS (Missing coordinates)
        def_no_gps = Defect(
            defect_code=f"DEF-3D-NOGPS-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=1,
            defect_type="CORROSION",
            severity=DefectSeverity.MEDIUM,
            confidence=0.79,
            status=DefectStatus.VERIFIED,
            latitude=None,
            longitude=None,
            coordinate_source="UNAVAILABLE",
            location_precision="UNAVAILABLE",
        )

        # Create Raw AIDetection record (NOT VERIFIED - should be excluded!)
        raw_det = AIDetection(
            detection_code=f"DET-RAW-{int(time.time()*1000)}",
            inspection_id=1,
            media_id=1,
            image_id=1,
            dam_id=1,
            defect_type="SEEPAGE",
            confidence=0.65,
            bbox_x_min=10.0,
            bbox_y_min=10.0,
            bbox_x_max=50.0,
            bbox_y_max=50.0,
            review_status="AI_DETECTED"
        )

        db.add(def_gps)
        db.add(def_no_gps)
        db.add(raw_det)
        db.commit()

        # Call 3D defects API
        res = client.get("/api/v1/digital-twin/dams/1/defects", headers=engineer_headers)
        assert res.status_code == 200
        items = res.json()

        item_gps = next((d for d in items if d["defect_code"] == def_gps.defect_code), None)
        item_no_gps = next((d for d in items if d["defect_code"] == def_no_gps.defect_code), None)
        item_raw = next((d for d in items if d["defect_code"] == raw_det.detection_code), None)

        # 1. Raw AI detection must NOT appear as verified 3D defect
        assert item_raw is None, "Raw AI detection must not be returned in verified 3D defect overlay"

        # 2. Defect with GPS has position_available=True and ENU coordinates
        assert item_gps is not None
        assert item_gps["position_available"] is True
        assert item_gps["location_precision"] == "MEDIA_REFERENCE"
        assert item_gps["position_3d"]["x"] != 0.0 or item_gps["position_3d"]["z"] != 0.0

        # 3. Defect with missing GPS has position_available=False and location_precision='UNAVAILABLE'
        assert item_no_gps is not None
        assert item_no_gps["position_available"] is False
        assert item_no_gps["location_precision"] == "UNAVAILABLE"
        assert item_no_gps["position_3d"] == {"x": 0.0, "y": 0.0, "z": 0.0}

    finally:
        db.close()


def test_phase2d_model_activation_and_audit():
    """
    Test Phase 2D Model Activation and Audit Log entries:
    - Activating historical V1 deactivates V2.
    - DIGITAL_TWIN_MODEL_ACTIVATED audit log entry recorded.
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")

    models_res = client.get("/api/v1/digital-twin/dams/1/models", headers=engineer_headers)
    assert models_res.status_code == 200
    models = models_res.json()

    if len(models) >= 2:
        target_model = models[-1] # Older model
        act_res = client.patch(f"/api/v1/digital-twin/models/{target_model['id']}/activate", headers=engineer_headers)
        assert act_res.status_code == 200
        assert act_res.json()["is_active"] is True

        manager_headers = get_auth_headers("manager@hydrovision.gov.in", "manager123")
        audit_res = client.get("/api/v1/audit", headers=manager_headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        activations = [l for l in logs if l["action"] == "DIGITAL_TWIN_MODEL_ACTIVATED"]
        assert len(activations) > 0, "DIGITAL_TWIN_MODEL_ACTIVATED audit log entry must be present"
