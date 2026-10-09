import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers(email: str, password: str):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_authority_rbac_permissions():
    headers = get_auth_headers("authority@hydrovision.gov.in", "authority123")

    import time
    timestamp = int(time.time())
    # 1. Authority CAN create Dam
    dam_res = client.post("/api/v1/dams", json={
        "name": "Tehri Hydroelectric Dam",
        "code": f"THR-RBAC-{timestamp}",
        "state": "Uttarakhand",
        "district": "Tehri Garhwal",
        "dam_type": "Rockfill",
        "height_meters": 260.5,
        "latitude": 30.37,
        "longitude": 78.48
    }, headers=headers)
    assert dam_res.status_code == 201

    # 2. Authority CANNOT run AI analysis (Must return HTTP 403)
    ai_res = client.post("/api/v1/ai/analyze/1", headers=headers)
    assert ai_res.status_code == 403

    # 3. Authority CANNOT verify defects (Must return HTTP 403)
    verify_res = client.patch("/api/v1/defects/1/verify", json={"status": "VERIFIED"}, headers=headers)
    assert verify_res.status_code == 403

    # 4. Authority CANNOT create work order (Must return HTTP 403)
    wo_res = client.post("/api/v1/maintenance/work-orders", json={
        "dam_id": 1, "defect_id": 1, "description": "Repair"
    }, headers=headers)
    assert wo_res.status_code == 403

def test_operator_rbac_permissions():
    headers = get_auth_headers("operator@hydrovision.gov.in", "operator123")

    # 1. Operator CANNOT create dam (Must return HTTP 403)
    dam_res = client.post("/api/v1/dams", json={
        "name": "Forbidden Dam", "code": "FORBID-01", "state": "Test", "district": "Test",
        "dam_type": "Gravity", "height_meters": 100, "latitude": 20, "longitude": 70
    }, headers=headers)
    assert dam_res.status_code == 403

    # 2. Operator CANNOT run AI analysis (Must return HTTP 403)
    ai_res = client.post("/api/v1/ai/analyze/1", headers=headers)
    assert ai_res.status_code == 403

    # 3. Operator CANNOT verify defects (Must return HTTP 403)
    verify_res = client.patch("/api/v1/defects/1/verify", json={"status": "VERIFIED"}, headers=headers)
    assert verify_res.status_code == 403

    # 4. Operator CANNOT view Audit Trail (Must return HTTP 403)
    audit_res = client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 403

def test_engineer_rbac_permissions():
    headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")

    # 1. Engineer CANNOT create dam (Must return HTTP 403)
    dam_res = client.post("/api/v1/dams", json={
        "name": "Forbidden Dam 2", "code": "FORBID-02", "state": "Test", "district": "Test",
        "dam_type": "Gravity", "height_meters": 100, "latitude": 20, "longitude": 70
    }, headers=headers)
    assert dam_res.status_code == 403

    # 2. Engineer CANNOT create Work Order (Must return HTTP 403)
    wo_res = client.post("/api/v1/maintenance/work-orders", json={
        "dam_id": 1, "defect_id": 1, "description": "Repair"
    }, headers=headers)
    assert wo_res.status_code == 403

    # 3. Engineer CANNOT view Audit Trail (Must return HTTP 403)
    audit_res = client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 403

def test_manager_rbac_permissions():
    headers = get_auth_headers("manager@hydrovision.gov.in", "manager123")

    # 1. Manager CANNOT create dam (Must return HTTP 403)
    dam_res = client.post("/api/v1/dams", json={
        "name": "Forbidden Dam 3", "code": "FORBID-03", "state": "Test", "district": "Test",
        "dam_type": "Gravity", "height_meters": 100, "latitude": 20, "longitude": 70
    }, headers=headers)
    assert dam_res.status_code == 403

    # 2. Manager CANNOT run AI analysis (Must return HTTP 403)
    ai_res = client.post("/api/v1/ai/analyze/1", headers=headers)
    assert ai_res.status_code == 403

    # 3. Manager CANNOT verify defects (Must return HTTP 403)
    verify_res = client.patch("/api/v1/defects/1/verify", json={"status": "VERIFIED"}, headers=headers)
    assert verify_res.status_code == 403

    # 4. Manager CAN view Audit Trail
    audit_res = client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 200
