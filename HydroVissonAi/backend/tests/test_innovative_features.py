import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post("/api/v1/auth/login", json={"email": "engineer@hydrovision.gov.in", "password": "engineer123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_defect_4d_evolution_endpoint(auth_headers):
    from app.database.base import SessionLocal
    from app.database.models import Dam, Inspection, Defect, DefectStatus, DefectSeverity
    import time

    db = SessionLocal()
    try:
        dam = Dam(
            name="Evolution Test Dam",
            code=f"DAM-EVO-{int(time.time()*1000)}",
            state="Uttarakhand",
            district="Tehri",
            dam_type="Concrete Gravity",
            height_meters=140.0,
            latitude=30.3700,
            longitude=78.4700,
            status="OPERATIONAL"
        )
        db.add(dam)
        db.commit()
        db.refresh(dam)

        insp = Inspection(
            inspection_code=f"INSP-EVO-{int(time.time()*1000)}",
            dam_id=dam.id,
            inspection_type="ROUTINE",
            status="COMPLETED"
        )
        db.add(insp)
        db.commit()
        db.refresh(insp)

        defect = Defect(
            defect_code=f"DEF-EVO-{int(time.time()*1000)}",
            dam_id=dam.id,
            inspection_id=insp.id,
            defect_type="SPALLING",
            severity=DefectSeverity.HIGH,
            confidence=0.95,
            measurement_type="ESTIMATED",
            status=DefectStatus.AI_DETECTED
        )
        db.add(defect)
        db.commit()
        db.refresh(defect)
        defect_id = defect.id
    finally:
        db.close()

    res = client.get(f"/api/v1/defects/{defect_id}/evolution", headers=auth_headers)
    assert res.status_code == 200, f"Got status {res.status_code}: {res.text}"
    data = res.json()
    assert data["defect_id"] == defect_id
    assert "timeline" in data
    assert isinstance(data["timeline"], list)

def test_spillway_inundation_simulator(auth_headers):
    from app.database.base import SessionLocal
    from app.database.models import Dam
    import time

    db = SessionLocal()
    try:
        dam = Dam(
            name="Inundation Test Dam",
            code=f"DAM-INUND-{int(time.time()*1000)}",
            state="Uttarakhand",
            district="Tehri",
            dam_type="Concrete Gravity",
            height_meters=140.0,
            latitude=30.3700,
            longitude=78.4700,
            status="OPERATIONAL"
        )
        db.add(dam)
        db.commit()
        db.refresh(dam)
        dam_id = dam.id
    finally:
        db.close()

    payload = {
        "water_level_m": 830.0,
        "discharge_cusecs": 35000.0,
        "gate_open_percent": 75.0,
        "rainfall_intensity_mm_hr": 40.0
    }
    res = client.post(f"/api/v1/dams/{dam_id}/simulate-inundation", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["dam_id"] == dam_id
    assert "inundation_zones" in data
    assert len(data["inundation_zones"]) == 3
    assert data["inundation_risk_level"] in ["CRITICAL_RED_ALERT", "HIGH_AMBER_ADVISORY", "MODERATE_NORMAL"]

def test_hydrovision_copilot_query(auth_headers):
    payload = {"query": "What are the NDSA compliance rules for pre-monsoon dam inspection?"}
    res = client.post("/api/v1/ai/copilot/query", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "NDSA" in data["answer"]
    assert len(data["citations"]) > 0
    assert len(data["suggested_follow_ups"]) > 0
