import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.base import SessionLocal
from app.database.models import Dam, Inspection, DroneDataset, DroneImage, AIDetection, Defect, AuditLog

client = TestClient(app)

def get_auth_headers(email: str, password: str):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_phase2c_gps_inheritance_and_missing_gps_protection():
    """
    Phase 2C Mandatory Core Test:
    1. Media with EXIF GPS -> Verified Defect inherits coordinate_source='MEDIA_GPS' & location_precision='MEDIA_REFERENCE'.
    2. Media with NO GPS -> Verified Defect has coordinate_source='UNAVAILABLE', latitude=None, longitude=None, geometry=None.
       Zero fake coordinates invented!
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")

    db = SessionLocal()
    try:
        insp = db.query(Inspection).filter(Inspection.id == 1).first()
        dam_id = insp.dam_id

        # 1. Create Image WITH GPS
        img_gps = DroneImage(
            dataset_id=1,
            filename="gps_test_photo.jpg",
            file_path="uploads/gps_test_photo.jpg",
            file_size_bytes=102400,
            file_hash_sha256="hash_gps_12345",
            gps_status="EXIF_EXTRACTED",
            latitude=11.78650,
            longitude=77.80050,
            altitude=250.0,
            quality_status="VALID"
        )
        db.add(img_gps)
        db.commit()
        db.refresh(img_gps)

        det_gps = AIDetection(
            detection_code=f"DET-GPS-{int(time.time()*1000)}",
            inspection_id=1,
            media_id=img_gps.id,
            image_id=img_gps.id,
            dam_id=dam_id,
            defect_type="CRACK",
            confidence=0.91,
            bbox_x_min=100.0,
            bbox_y_min=150.0,
            bbox_x_max=400.0,
            bbox_y_max=500.0,
            review_status="AI_DETECTED"
        )
        db.add(det_gps)

        # 2. Create Image WITHOUT GPS (Missing GPS case)
        img_nogps = DroneImage(
            dataset_id=1,
            filename="nogps_test_photo.jpg",
            file_path="uploads/nogps_test_photo.jpg",
            file_size_bytes=102400,
            file_hash_sha256="hash_nogps_67890",
            gps_status="UNAVAILABLE",
            latitude=None,
            longitude=None,
            quality_status="VALID"
        )
        db.add(img_nogps)
        db.commit()
        db.refresh(img_nogps)

        det_nogps = AIDetection(
            detection_code=f"DET-NOGPS-{int(time.time()*1000)}",
            inspection_id=1,
            media_id=img_nogps.id,
            image_id=img_nogps.id,
            dam_id=dam_id,
            defect_type="CORROSION",
            confidence=0.88,
            bbox_x_min=120.0,
            bbox_y_min=180.0,
            bbox_x_max=350.0,
            bbox_y_max=420.0,
            review_status="AI_DETECTED"
        )
        db.add(det_nogps)
        db.commit()
        db.refresh(det_gps)
        db.refresh(det_nogps)

        det_gps_id = det_gps.id
        det_nogps_id = det_nogps.id
    finally:
        db.close()

    # Engineer reviews & accepts detection WITH GPS
    acc_gps = client.patch(
        f"/api/v1/ai/detections/{det_gps_id}/review",
        json={"action": "ACCEPT", "severity": "HIGH"},
        headers=engineer_headers
    )
    assert acc_gps.status_code == 200

    # Engineer reviews & accepts detection WITHOUT GPS
    acc_nogps = client.patch(
        f"/api/v1/ai/detections/{det_nogps_id}/review",
        json={"action": "ACCEPT", "severity": "MEDIUM"},
        headers=engineer_headers
    )
    assert acc_nogps.status_code == 200

    # Verify GeoJSON outputs
    db = SessionLocal()
    try:
        def_gps = db.query(Defect).filter(Defect.source_detection_id == det_gps_id).first()
        assert def_gps is not None
        assert def_gps.coordinate_source == "MEDIA_GPS"
        assert def_gps.location_precision == "MEDIA_REFERENCE"
        assert def_gps.latitude == 11.78650
        assert def_gps.longitude == 77.80050

        def_nogps = db.query(Defect).filter(Defect.source_detection_id == det_nogps_id).first()
        assert def_nogps is not None
        assert def_nogps.coordinate_source == "UNAVAILABLE"
        assert def_nogps.location_precision == "UNAVAILABLE"
        assert def_nogps.latitude is None
        assert def_nogps.longitude is None
        assert def_nogps.geometry is None
    finally:
        db.close()

    # Test GeoJSON API output for defect WITHOUT GPS
    res_nogps = client.get(f"/api/v1/gis/defects/{def_nogps.id}", headers=engineer_headers)
    assert res_nogps.status_code == 200
    geojson_nogps = res_nogps.json()
    assert geojson_nogps["type"] == "Feature"
    assert geojson_nogps["geometry"] is None
    assert geojson_nogps["properties"]["location_source"] == "UNAVAILABLE"

def test_phase2c_manual_defect_georeferencing_and_audit():
    """
    Test manual defect coordinate update endpoint:
    1. Valid coordinates update latitude, longitude, geometry, coordinate_source='MANUAL'.
    2. Invalid coordinates (e.g. lat > 90) return 400 Bad Request.
    3. Audit trail entry created (DEFECT_LOCATION_UPDATED).
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")

    db = SessionLocal()
    try:
        defc = db.query(Defect).filter(Defect.coordinate_source == "UNAVAILABLE").first()
        assert defc is not None
        target_defect_id = defc.id
    finally:
        db.close()

    # Test Invalid Latitude rejection
    bad_res = client.patch(
        f"/api/v1/gis/defects/{target_defect_id}/location",
        json={"latitude": 105.0, "longitude": 77.800},
        headers=engineer_headers
    )
    assert bad_res.status_code == 400

    # Test Valid Georeferencing
    good_res = client.patch(
        f"/api/v1/gis/defects/{target_defect_id}/location",
        json={
            "latitude": 11.78712,
            "longitude": 77.80145,
            "location_precision": "MANUAL_GEOREFERENCE",
            "coordinate_accuracy_meters": 0.5,
            "reason": "Precision total-station survey verification"
        },
        headers=engineer_headers
    )
    assert good_res.status_code == 200
    geo_data = good_res.json()
    assert geo_data["geometry"]["type"] == "Point"
    assert geo_data["geometry"]["coordinates"] == [77.80145, 11.78712]  # Longitude X, Latitude Y
    assert geo_data["properties"]["location_source"] == "MANUAL"
    assert geo_data["properties"]["coordinate_accuracy_meters"] == 0.5

    # Verify Audit Log Entry
    db = SessionLocal()
    try:
        audit = db.query(AuditLog).filter(
            AuditLog.entity_type == "Defect",
            AuditLog.entity_id == str(target_defect_id),
            AuditLog.action == "DEFECT_LOCATION_UPDATED"
        ).order_by(AuditLog.id.desc()).first()
        assert audit is not None
        assert "lat=11.78712" in audit.new_value
    finally:
        db.close()

def test_phase2c_geojson_api_endpoints_and_filtering():
    """
    Test GIS GeoJSON endpoints:
    - GET /api/v1/gis/dams/{id}
    - GET /api/v1/gis/inspections/{id}/defects
    - GET /api/v1/gis/defects (with filters: dam_id, defect_type, severity, coordinate_source)
    """
    headers = get_auth_headers("authority@hydrovision.gov.in", "authority123")

    # 1. Dam GIS Endpoint
    dam_res = client.get("/api/v1/gis/dams/1", headers=headers)
    assert dam_res.status_code == 200
    dam_data = dam_res.json()
    assert dam_data["id"] == 1
    assert dam_data["geometry"]["type"] == "Point"
    assert dam_data["location_label"] == "Dam Reference Location"

    # 2. Inspection Defects GeoJSON
    insp_res = client.get("/api/v1/gis/inspections/1/defects", headers=headers)
    assert insp_res.status_code == 200
    insp_fc = insp_res.json()
    assert insp_fc["type"] == "FeatureCollection"
    assert isinstance(insp_fc["features"], list)

    # 3. Defect Filtering GeoJSON
    filt_res = client.get("/api/v1/gis/defects?dam_id=1&defect_type=CRACK&coordinate_source=MEDIA_GPS", headers=headers)
    assert filt_res.status_code == 200
    filt_fc = filt_res.json()
    assert filt_fc["type"] == "FeatureCollection"
    for feat in filt_fc["features"]:
        assert feat["properties"]["defect_type"] == "CRACK"
        assert feat["properties"]["location_source"] == "MEDIA_GPS"

def test_phase2c_location_update_rbac_enforcement():
    """
    Test strict RBAC on location update endpoint:
    - INSPECTION_ENGINEER -> 200 OK
    - DAM_OPERATOR -> 403 Forbidden
    - AUTHORITY -> 403 Forbidden
    - MAINTENANCE_MANAGER -> 403 Forbidden
    """
    operator_headers = get_auth_headers("operator@hydrovision.gov.in", "operator123")
    authority_headers = get_auth_headers("authority@hydrovision.gov.in", "authority123")
    manager_headers = get_auth_headers("manager@hydrovision.gov.in", "manager123")

    db = SessionLocal()
    try:
        defc = db.query(Defect).first()
        defc_id = defc.id
    finally:
        db.close()

    loc_payload = {"latitude": 11.7850, "longitude": 77.8000}

    # DAM_OPERATOR -> 403
    res_op = client.patch(f"/api/v1/gis/defects/{defc_id}/location", json=loc_payload, headers=operator_headers)
    assert res_op.status_code == 403

    # AUTHORITY -> 403
    res_auth = client.patch(f"/api/v1/gis/defects/{defc_id}/location", json=loc_payload, headers=authority_headers)
    assert res_auth.status_code == 403

    # MAINTENANCE_MANAGER -> 403
    res_mgr = client.patch(f"/api/v1/gis/defects/{defc_id}/location", json=loc_payload, headers=manager_headers)
    assert res_mgr.status_code == 403
