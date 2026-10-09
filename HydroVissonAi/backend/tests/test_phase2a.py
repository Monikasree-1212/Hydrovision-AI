import io
import os
import time
import pytest
import numpy as np
import cv2
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers(email: str, password: str):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def create_sample_jpeg_bytes(width=1920, height=1080, color=(128, 128, 128)):
    # Generate an image buffer
    img_array = np.full((height, width, 3), color, dtype=np.uint8)
    # Add some noise/contrast so Laplacian blur score > 0
    cv2.putText(img_array, "HYDROVISION TEST IMAGE", (100, 500), cv2.FONT_HERSHEY_SIMPLEX, 3, (255, 255, 255), 5)
    cv2.rectangle(img_array, (200, 200), (800, 800), (0, 0, 255), -1)
    
    is_success, buffer = cv2.imencode(".jpg", img_array)
    return buffer.tobytes()

def test_phase2a_image_ingestion_and_quality_engine():
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    
    # 1. Ensure inspection exists
    insp_res = client.get("/api/v1/inspections/1", headers=engineer_headers)
    assert insp_res.status_code == 200, f"Inspection 1 should exist: {insp_res.text}"

    # 2. Prepare high quality image
    img_bytes = create_sample_jpeg_bytes(1920, 1080)
    
    upload_res = client.post(
        "/api/v1/uploads/inspection/1",
        data={"dataset_name": "Phase 2A Test Survey", "drone_model": "DJI Matrice 300 RTK"},
        files=[("files", ("test_dam_wall.jpg", img_bytes, "image/jpeg"))],
        headers=engineer_headers
    )
    
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    dataset_data = upload_res.json()
    assert dataset_data["total_files"] == 1
    assert len(dataset_data["images"]) == 1
    
    media = dataset_data["images"][0]
    assert media["filename"] == "test_dam_wall.jpg"
    assert media["file_hash_sha256"] is not None
    assert len(media["file_hash_sha256"]) == 64
    assert media["storage_key"].startswith("media/")
    assert media["resolution_w"] == 1920
    assert media["resolution_h"] == 1080
    assert media["blur_score"] >= 0.0
    assert media["quality_status"] in ["VALID", "WARNING"]

def test_phase2a_sha256_duplicate_detection():
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    
    # Generate unique content for this test
    timestamp = int(time.time() * 1000)
    img_array = np.full((1080, 1920, 3), (200, 100, 50), dtype=np.uint8)
    cv2.putText(img_array, f"DUP TEST {timestamp}", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
    _, buffer = cv2.imencode(".jpg", img_array)
    img_bytes = buffer.tobytes()

    # Upload first time
    res1 = client.post(
        "/api/v1/uploads/inspection/1",
        data={"dataset_name": "Dup Test Batch 1"},
        files=[("files", (f"original_{timestamp}.jpg", img_bytes, "image/jpeg"))],
        headers=engineer_headers
    )
    assert res1.status_code == 201
    media1 = res1.json()["images"][0]
    sha256_hash1 = media1["file_hash_sha256"]

    # Upload exact same bytes second time
    res2 = client.post(
        "/api/v1/uploads/inspection/1",
        data={"dataset_name": "Dup Test Batch 2"},
        files=[("files", (f"duplicate_{timestamp}.jpg", img_bytes, "image/jpeg"))],
        headers=engineer_headers
    )
    assert res2.status_code == 201
    media2 = res2.json()["images"][0]
    assert media2["file_hash_sha256"] == sha256_hash1
    
    # Duplicate issue should be flagged
    assert media2["quality_status"] == "WARNING"
    assert "DUPLICATE_FILE" in media2["quality_issues"]

def test_phase2a_corrupted_image_rejection():
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    
    corrupted_bytes = b"NOT_AN_IMAGE_HEADER_GARBAGE_DATA_12345"
    
    res = client.post(
        "/api/v1/uploads/inspection/1",
        data={"dataset_name": "Corrupted Batch"},
        files=[("files", ("corrupted.jpg", corrupted_bytes, "image/jpeg"))],
        headers=engineer_headers
    )
    assert res.status_code == 201
    media = res.json()["images"][0]
    assert media["quality_status"] == "REJECTED"
    assert "Corrupted image" in media["quality_issues"]

def test_phase2a_manual_georeferencing_and_rbac():
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    operator_headers = get_auth_headers("operator@hydrovision.gov.in", "operator123")
    manager_headers = get_auth_headers("manager@hydrovision.gov.in", "manager123")

    # 1. Upload an image to georeference
    img_bytes = create_sample_jpeg_bytes()
    res = client.post(
        "/api/v1/uploads/inspection/1",
        data={"dataset_name": "Georef Test"},
        files=[("files", ("georef_target.jpg", img_bytes, "image/jpeg"))],
        headers=engineer_headers
    )
    media_id = res.json()["images"][0]["id"]

    # 2. Operator CANNOT georeference (Must return HTTP 403)
    op_res = client.patch(
        f"/api/v1/uploads/media/{media_id}/georeference",
        json={"latitude": 30.375, "longitude": 78.485, "altitude": 265.0},
        headers=operator_headers
    )
    assert op_res.status_code == 403

    # 3. Manager CANNOT georeference (Must return HTTP 403)
    mgr_res = client.patch(
        f"/api/v1/uploads/media/{media_id}/georeference",
        json={"latitude": 30.375, "longitude": 78.485, "altitude": 265.0},
        headers=manager_headers
    )
    assert mgr_res.status_code == 403

    # 4. Out of bounds lat/lng fails (Must return HTTP 400)
    invalid_res = client.patch(
        f"/api/v1/uploads/media/{media_id}/georeference",
        json={"latitude": 120.0, "longitude": 78.485},
        headers=engineer_headers
    )
    assert invalid_res.status_code == 400

    # 5. Inspection Engineer CAN georeference
    eng_res = client.patch(
        f"/api/v1/uploads/media/{media_id}/georeference",
        json={"latitude": 30.3751, "longitude": 78.4852, "altitude": 265.5},
        headers=engineer_headers
    )
    assert eng_res.status_code == 200
    updated_media = eng_res.json()
    assert updated_media["latitude"] == 30.3751
    assert updated_media["longitude"] == 78.4852
    assert updated_media["altitude"] == 265.5
    assert updated_media["gps_status"] == "MANUALLY_GEOREFERENCED"
    assert updated_media["georeference_method"] == "MANUAL"

def test_phase2a_file_retrieval():
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    
    img_bytes = create_sample_jpeg_bytes()
    upload_res = client.post(
        "/api/v1/uploads/inspection/1",
        data={"dataset_name": "File Retrieval Test"},
        files=[("files", ("retrieval_test.jpg", img_bytes, "image/jpeg"))],
        headers=engineer_headers
    )
    media = upload_res.json()["images"][0]
    storage_key = media["storage_key"]

    # Retrieve file directly
    file_res = client.get(f"/api/v1/uploads/file/{storage_key}")
    assert file_res.status_code == 200
    assert file_res.headers["content-type"] == "image/jpeg"
    assert len(file_res.content) == len(img_bytes)
