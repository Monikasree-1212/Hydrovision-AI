import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.seed import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    init_db()

client = TestClient(app)

def get_auth_headers(email: str = "authority@hydrovision.gov.in", password: str = "authority123"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_get_public_dams():
    res = client.get("/api/v1/public/dams")
    assert res.status_code == 200
    dams = res.json()
    assert isinstance(dams, list)
    assert len(dams) > 0
    assert "name" in dams[0]
    assert "latitude" in dams[0]

def test_submit_and_track_public_complaint():
    # Submit complaint near Tehri Dam (30.3751, 78.4852)
    payload = {
        "citizen_name": "Test Citizen",
        "citizen_phone": "+91 99999 88888",
        "citizen_email": "test.citizen@example.com",
        "category": "SEEPAGE",
        "title": "Severe Seepage and Wet Patch Near Downstream Toe",
        "description": "Observed significant water weeping near downstream toe of Tehri dam wall.",
        "latitude": 30.3760,
        "longitude": 78.4860,
        "location_address": "Tehri Dam Downstream Wall Access",
        "photo_urls_json": ["https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80"]
    }
    res = client.post("/api/v1/public/complaints", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "tracking_code" in data
    assert data["tracking_code"].startswith("GRV-")
    assert data["status"] == "SUBMITTED"
    assert data["ai_risk_score"] > 70.0
    assert data["dam_id"] is not None # Auto-spatially matched to Tehri Dam
    
    tracking_code = data["tracking_code"]
    complaint_id = data["id"]

    # Track by tracking code
    track_res = client.get(f"/api/v1/public/complaints/track/{tracking_code}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["tracking_code"] == tracking_code
    assert track_data["title"] == payload["title"]

    return complaint_id, tracking_code

def test_authority_view_and_action_grievance():
    headers = get_auth_headers("authority@hydrovision.gov.in", "authority123")

    # Fetch all authority grievances
    res = client.get("/api/v1/authority/grievances", headers=headers)
    assert res.status_code == 200
    grievances = res.json()
    assert len(grievances) > 0

    first_id = grievances[0]["id"]

    # Authority triage action: assign work order & update status
    action_payload = {
        "status": "REPAIR_IN_PROGRESS",
        "authority_notes": "Emergency repair crew dispatched with high-grade grouting injection kit.",
        "assign_work_order": True,
        "work_order_priority": "CRITICAL"
    }
    action_res = client.patch(f"/api/v1/authority/grievances/{first_id}/action", json=action_payload, headers=headers)
    assert action_res.status_code == 200
    updated_data = action_res.json()
    assert updated_data["status"] == "REPAIR_IN_PROGRESS"
    assert updated_data["authority_notes"] == action_payload["authority_notes"]
    assert updated_data["work_order_id"] is not None

    # Test resolving complaint with resolution photo
    resolve_payload = {
        "status": "RESOLVED",
        "authority_notes": "Seepage completely sealed. Post-repair inspection passed successfully.",
        "resolution_photo_url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
    }
    resolve_res = client.patch(f"/api/v1/authority/grievances/{first_id}/action", json=resolve_payload, headers=headers)
    assert resolve_res.status_code == 200
    resolved_data = resolve_res.json()
    assert resolved_data["status"] == "RESOLVED"
    assert resolved_data["resolution_photo_url"] == resolve_payload["resolution_photo_url"]
    assert resolved_data["resolved_at"] is not None
