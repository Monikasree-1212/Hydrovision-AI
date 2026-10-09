import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers(email: str, password: str):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_supreme_command_login():
    headers = get_auth_headers("supreme.command@hydrovision.gov.in", "SupremeCommand#2026!")
    assert "Authorization" in headers

def test_supreme_national_hierarchy():
    headers = get_auth_headers("supreme.command@hydrovision.gov.in", "SupremeCommand#2026!")
    res = client.get("/api/v1/supreme/hierarchy", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "states" in data
    assert data["summary"]["command_authority"] == "National Dam Safety Inspectorate — Supreme Command HQ"
    assert len(data["states"]) > 0

def test_supreme_dams_list_and_filtering():
    headers = get_auth_headers("supreme.command@hydrovision.gov.in", "SupremeCommand#2026!")
    # Get all dams
    res = client.get("/api/v1/supreme/dams", headers=headers)
    assert res.status_code == 200
    dams = res.json()
    assert len(dams) > 0

    # Filter by state if available
    first_dam = dams[0]
    st = first_dam["state"]
    res_filtered = client.get(f"/api/v1/supreme/dams?state={st}", headers=headers)
    assert res_filtered.status_code == 200
    filtered_dams = res_filtered.json()
    assert all(d["state"] == st for d in filtered_dams)

def test_supreme_dam_dossier_directive_and_rating():
    headers = get_auth_headers("supreme.command@hydrovision.gov.in", "SupremeCommand#2026!")
    # Get first dam ID
    dams_res = client.get("/api/v1/supreme/dams", headers=headers)
    dam_id = dams_res.json()[0]["id"]

    # 1. Fetch Dossier
    dossier_res = client.get(f"/api/v1/supreme/dams/{dam_id}/dossier", headers=headers)
    assert dossier_res.status_code == 200
    dossier = dossier_res.json()
    assert "dam" in dossier
    assert "directives" in dossier
    assert dossier["dam"]["id"] == dam_id

    # 2. Issue Supreme Directive
    directive_res = client.post(f"/api/v1/supreme/dams/{dam_id}/directives", json={
        "title": "Automated Test Command Directive",
        "command_text": "Mandatory structural ultrasound scan within 24 hours.",
        "priority": "URGENT"
    }, headers=headers)
    assert directive_res.status_code == 200
    directive_data = directive_res.json()
    assert directive_data["status"] == "SUCCESS"
    assert directive_data["directive"]["title"] == "Automated Test Command Directive"

    # 3. Update Official Safety Rating
    rating_res = client.post(f"/api/v1/supreme/dams/{dam_id}/rating", json={
        "rating": 4.8,
        "grade": "A+",
        "comments": "Excellent maintenance and active monitoring."
    }, headers=headers)
    assert rating_res.status_code == 200
    res_data = rating_res.json()
    assert res_data["status"] == "SUCCESS"
    assert res_data["supreme_rating"] == 4.8
    assert res_data["rating_grade"] == "A+"

def test_supreme_rbac_security_isolation():
    # Operator cannot issue supreme command directives
    op_headers = get_auth_headers("operator@hydrovision.gov.in", "operator123")
    res = client.post("/api/v1/supreme/dams/1/directives", json={
        "title": "Unauthorized Command",
        "command_text": "Should fail",
        "priority": "HIGH"
    }, headers=op_headers)
    assert res.status_code == 403

    # Operator cannot post official safety rating
    res_rating = client.post("/api/v1/supreme/dams/1/rating", json={
        "rating": 1.0,
        "grade": "F"
    }, headers=op_headers)
    assert res_rating.status_code == 403
