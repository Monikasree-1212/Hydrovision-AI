import io
import os
import pytest
import numpy as np
import cv2
import tempfile
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.uploads.quality_engine import quality_engine
from app.uploads.storage_engine import storage_engine
from app.database.base import SessionLocal
from app.database.models import Inspection, InspectionStatus, DroneImage, DroneDataset, UserRole

client = TestClient(app)

def get_auth_headers(email: str = "engineer@hydrovision.gov.in", password: str = "engineer123"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def create_sample_jpg_bytes(width=1920, height=1080, color=(128, 128, 128), text_val="TEST"):
    img_array = np.full((height, width, 3), color, dtype=np.uint8)
    cv2.putText(img_array, f"HYDROVISION DRONE DATA {text_val}", (100, 500), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 4)
    cv2.rectangle(img_array, (200, 200), (600, 600), (0, 255, 0), -1)
    is_success, buffer = cv2.imencode(".jpg", img_array)
    return buffer.tobytes()

def create_sample_mp4_bytes(width=1920, height=1080, duration_frames=30):
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(tmp_path, fourcc, 30.0, (width, height))
    for i in range(duration_frames):
        frame = np.full((height, width, 3), (i * 5 % 255, 100, 200), dtype=np.uint8)
        cv2.putText(frame, f"FRAME {i}", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
        out.write(frame)
    out.release()

    with open(tmp_path, "rb") as f:
        video_bytes = f.read()
    os.remove(tmp_path)
    return video_bytes

def get_or_create_test_inspection():
    from app.database.models import Dam
    import time
    db = SessionLocal()
    try:
        dam = db.query(Dam).first()
        if not dam:
            dam = Dam(
                name="Test Upload Dam",
                code=f"DAM-TEST-{int(time.time()*1000)}",
                state="Uttarakhand",
                district="Tehri",
                dam_type="Concrete Gravity",
                height_meters=100.0,
                latitude=30.37,
                longitude=78.47,
                status="OPERATIONAL"
            )
            db.add(dam)
            db.commit()
            db.refresh(dam)

        insp = db.query(Inspection).filter(Inspection.dam_id == dam.id).first()
        if not insp:
            insp = Inspection(
                inspection_code=f"INSP-TEST-{int(time.time()*1000)}",
                dam_id=dam.id,
                inspection_type="DRONE_VISUAL",
                status=InspectionStatus.PLANNED
            )
            db.add(insp)
            db.commit()
            db.refresh(insp)
        return insp.id
    finally:
        db.close()

def test_upload_single_jpg():
    headers = get_auth_headers()
    insp_id = get_or_create_test_inspection()
    img_bytes = create_sample_jpg_bytes(text_val="SINGLE_JPG")
    sha256 = quality_engine.calculate_sha256(img_bytes)

    res = client.post(
        f"/api/v1/uploads/inspections/{insp_id}/upload-batch",
        data={"dataset_name": "Single JPG Test Survey"},
        files=[("files", ("drone_single_001.jpg", img_bytes, "image/jpeg"))],
        headers=headers
    )
    assert res.status_code == 201, f"Expected 201 Created, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["total_files"] == 1
    assert (data["valid_files"] + data["warning_files"]) >= 1
    assert len(data["images"]) == 1

    img = data["images"][0]
    assert img["filename"] == "drone_single_001.jpg"
    assert img["file_hash_sha256"] == sha256

    # Verify object exists in storage and SHA-256 of stored bytes matches
    stored_bytes = storage_engine.download(img["storage_key"])
    assert stored_bytes is not None, "Stored bytes must exist in storage engine"
    assert quality_engine.calculate_sha256(stored_bytes) == sha256

def test_upload_multiple_jpgs_4_files():
    headers = get_auth_headers()
    insp_id = get_or_create_test_inspection()
    files_payload = []
    hashes = []
    for i in range(4):
        b = create_sample_jpg_bytes(text_val=f"BATCH4_{i}")
        h = quality_engine.calculate_sha256(b)
        hashes.append(h)
        files_payload.append(("files", (f"drone_batch4_{i+1:03d}.jpg", b, "image/jpeg")))

    res = client.post(
        f"/api/v1/uploads/inspections/{insp_id}/upload-batch",
        data={"dataset_name": "4 JPG Batch Test"},
        files=files_payload,
        headers=headers
    )
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["total_files"] == 4
    assert len(data["images"]) == 4

    for img, expected_hash in zip(data["images"], reversed(hashes)):
        stored_bytes = storage_engine.download(img["storage_key"])
        assert stored_bytes is not None
        assert quality_engine.calculate_sha256(stored_bytes) == img["file_hash_sha256"]

def test_upload_mp4_video():
    headers = get_auth_headers()
    insp_id = get_or_create_test_inspection()
    mp4_bytes = create_sample_mp4_bytes()
    sha256 = quality_engine.calculate_sha256(mp4_bytes)

    res = client.post(
        f"/api/v1/uploads/inspections/{insp_id}/upload-batch",
        data={"dataset_name": "Drone Video Survey"},
        files=[("files", ("drone_flight_001.mp4", mp4_bytes, "video/mp4"))],
        headers=headers
    )
    assert res.status_code == 201, f"Failed MP4 upload: {res.text}"
    data = res.json()
    assert data["total_files"] == 1
    img = data["images"][0]
    assert img["media_type"] == "VIDEO"
    assert img["file_hash_sha256"] == sha256

    stored_bytes = storage_engine.download(img["storage_key"])
    assert stored_bytes is not None
    assert quality_engine.calculate_sha256(stored_bytes) == sha256

def test_upload_mixed_jpg_and_mp4():
    headers = get_auth_headers()
    insp_id = get_or_create_test_inspection()
    jpg_bytes = create_sample_jpg_bytes(text_val="MIXED_JPG")
    mp4_bytes = create_sample_mp4_bytes()

    res = client.post(
        f"/api/v1/uploads/inspections/{insp_id}/upload-batch",
        data={"dataset_name": "Mixed Media Survey"},
        files=[
            ("files", ("photo_001.jpg", jpg_bytes, "image/jpeg")),
            ("files", ("video_001.mp4", mp4_bytes, "video/mp4"))
        ],
        headers=headers
    )
    assert res.status_code == 201, f"Failed mixed upload: {res.text}"
    data = res.json()
    assert data["total_files"] == 2

def test_unsupported_file_extension():
    headers = get_auth_headers()
    insp_id = get_or_create_test_inspection()
    txt_bytes = b"This is a text report."

    res = client.post(
        f"/api/v1/uploads/inspections/{insp_id}/upload-batch",
        data={"dataset_name": "Invalid File Test"},
        files=[("files", ("invalid_doc.txt", txt_bytes, "text/plain"))],
        headers=headers
    )
    assert res.status_code == 201
    data = res.json()
    assert data["rejected_files"] == 1
    assert data["images"][0]["quality_status"] == "REJECTED"

def test_sha256_duplicate_detection():
    headers = get_auth_headers()
    insp_id = get_or_create_test_inspection()
    dup_bytes = create_sample_jpg_bytes(text_val="DUPLICATE_SAMPLE")

    # Upload first time
    res1 = client.post(
        f"/api/v1/uploads/inspections/{insp_id}/upload-batch",
        files=[("files", ("original.jpg", dup_bytes, "image/jpeg"))],
        headers=headers
    )
    assert res1.status_code == 201

    # Upload exact duplicate second time
    res2 = client.post(
        f"/api/v1/uploads/inspections/{insp_id}/upload-batch",
        files=[("files", ("duplicate_copy.jpg", dup_bytes, "image/jpeg"))],
        headers=headers
    )
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["images"][0]["quality_status"] == "WARNING"

def test_inspection_lifecycle_transition():
    headers = get_auth_headers()
    insp_id = get_or_create_test_inspection()
    db = SessionLocal()
    try:
        insp = db.query(Inspection).filter(Inspection.id == insp_id).first()
        assert insp is not None, f"Inspection {insp_id} must exist"
        assert insp.status == InspectionStatus.DATA_UPLOADED or insp.status == InspectionStatus.PLANNED
    finally:
        db.close()

def test_unauthorized_role_rejection():
    insp_id = get_or_create_test_inspection()
    # Login as Maintenance Manager (unauthorized for upload)
    res_mgr = client.post("/api/v1/auth/login", json={"email": "manager@hydrovision.gov.in", "password": "manager123"})
    mgr_token = res_mgr.json()["access_token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    img_bytes = create_sample_jpg_bytes()
    res = client.post(
        f"/api/v1/uploads/inspections/{insp_id}/upload-batch",
        files=[("files", ("unauth.jpg", img_bytes, "image/jpeg"))],
        headers=mgr_headers
    )
    assert res.status_code == 403, f"Expected 403 Forbidden for Manager, got {res.status_code}"
