import time
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database.base import SessionLocal
from app.database.models import Dam, Inspection, Defect, DefectStatus, DefectSeverity, AuditLog

client = TestClient(app)

def get_auth_headers(email: str, password: str):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_phase2e_historical_timeline_and_empty_states():
    """
    Test Phase 2E Timeline retrieval and single-inspection empty state protection.
    If 0 or 1 historical inspection exists, system MUST return UNAVAILABLE message.
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    db = SessionLocal()

    try:
        dam = Dam(
            name="Timeline Test Dam",
            code=f"DAM-TL-{int(time.time()*1000)}",
            state="Kerala",
            district="Idukki",
            dam_type="Concrete Gravity",
            height_meters=120.0,
            latitude=9.8500,
            longitude=76.9700,
            status="OPERATIONAL"
        )
        db.add(dam)
        db.commit()

        # 1. Create single inspection
        insp1 = Inspection(
            inspection_code=f"INSP-TL-1-{int(time.time()*1000)}",
            dam_id=dam.id,
            inspection_type="DRONE_VISUAL",
            inspection_date=datetime.utcnow() - timedelta(days=30),
            status="COMPLETED",
            coverage_percentage=95.0
        )
        db.add(insp1)
        db.commit()

        # Call timeline endpoint
        res_tl = client.get(f"/api/v1/historical/dams/{dam.id}/inspections", headers=engineer_headers)
        assert res_tl.status_code == 200
        tl_data = res_tl.json()
        assert tl_data["total_inspections"] == 1
        assert len(tl_data["timeline"]) == 1

        # Call compare endpoint with only 1 inspection -> Must yield UNAVAILABLE
        res_cmp = client.get(f"/api/v1/historical/inspections/{insp1.id}/compare", headers=engineer_headers)
        assert res_cmp.status_code == 200
        cmp_data = res_cmp.json()
        assert cmp_data["status"] == "UNAVAILABLE"
        assert "HISTORICAL COMPARISON UNAVAILABLE" in cmp_data["message"]
        assert len(cmp_data["comparisons"]) == 0

    finally:
        db.close()


def test_phase2e_spatial_type_matching_and_class_isolation():
    """
    Test Phase 2E Spatial and Defect Type Matching:
    - Same dam + nearby coords + same class ->Candidate Match.
    - Far-away location -> Cannot match.
    - Different defect class (CRACK vs CORROSION) -> Cannot match even if nearby.
    - Missing coordinates -> Cannot match.
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    db = SessionLocal()

    try:
        dam = db.query(Dam).filter(Dam.id == 1).first()
        base_lat = dam.latitude
        base_lng = dam.longitude

        # 1. Historical Inspection (30 days ago)
        hist_insp = Inspection(
            inspection_code=f"INSP-SPAT-H-{int(time.time()*1000)}",
            dam_id=1,
            inspection_type="DRONE_VISUAL",
            inspection_date=datetime.utcnow() - timedelta(days=30),
            status="COMPLETED",
            coverage_percentage=90.0
        )
        db.add(hist_insp)
        db.commit()

        # Defect 1 (Crack at base_lat, base_lng)
        hist_crack = Defect(
            defect_code=f"DEF-SP-H1-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=hist_insp.id,
            defect_type="CRACK",
            severity=DefectSeverity.LOW,
            estimated_length_mm=10.0,
            latitude=base_lat,
            longitude=base_lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        # Defect 2 (Corrosion at base_lat + 0.00002, base_lng) -> ~2 meters away
        hist_corrosion = Defect(
            defect_code=f"DEF-SP-H2-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=hist_insp.id,
            defect_type="CORROSION",
            severity=DefectSeverity.MEDIUM,
            estimated_area_sq_cm=5.0,
            latitude=base_lat + 0.00002,
            longitude=base_lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        # Defect 3 (Crack at base_lat + 0.01, base_lng) -> ~1.1 km away
        hist_far_crack = Defect(
            defect_code=f"DEF-SP-H3-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=hist_insp.id,
            defect_type="CRACK",
            severity=DefectSeverity.LOW,
            estimated_length_mm=15.0,
            latitude=base_lat + 0.01,
            longitude=base_lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        db.add_all([hist_crack, hist_corrosion, hist_far_crack])
        db.commit()

        # 2. Current Inspection (Today)
        curr_insp = Inspection(
            inspection_code=f"INSP-SPAT-C-{int(time.time()*1000)}",
            dam_id=1,
            inspection_type="DRONE_VISUAL",
            inspection_date=datetime.utcnow(),
            status="COMPLETED",
            coverage_percentage=90.0
        )
        db.add(curr_insp)
        db.commit()

        # Current Defect 1: Crack nearby hist_crack (at base_lat + 0.00001, base_lng) -> ~1 meter away, length 15mm (INCREASING)
        curr_crack = Defect(
            defect_code=f"DEF-SP-C1-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=curr_insp.id,
            defect_type="CRACK",
            severity=DefectSeverity.MEDIUM,
            estimated_length_mm=15.0,
            latitude=base_lat + 0.00001,
            longitude=base_lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        # Current Defect 2: Crack with MISSING LOCATION
        curr_unmapped_crack = Defect(
            defect_code=f"DEF-SP-C2-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=curr_insp.id,
            defect_type="CRACK",
            severity=DefectSeverity.MEDIUM,
            estimated_length_mm=20.0,
            latitude=None,
            longitude=None,
            coordinate_source="UNAVAILABLE",
            location_precision="UNAVAILABLE",
            status=DefectStatus.VERIFIED
        )

        db.add_all([curr_crack, curr_unmapped_crack])
        db.commit()

        # Run comparison API
        res = client.get(
            f"/api/v1/historical/inspections/{curr_insp.id}/compare?historical_inspection_id={hist_insp.id}&match_distance_meters=10.0",
            headers=engineer_headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        
        comps = data["comparisons"]

        # Check curr_crack match with hist_crack
        c1_match = next((c for c in comps if c["current_defect_id"] == curr_crack.id), None)
        assert c1_match is not None
        assert c1_match["historical_defect_id"] == hist_crack.id
        assert c1_match["match_method"] == "SPATIAL_AND_TYPE"
        assert c1_match["comparison_status"] == "INCREASING"
        assert c1_match["measurement_change_mm"] == 5.0
        assert c1_match["measurement_change_pct"] == 50.0
        assert c1_match["match_confidence"] > 0.8
        assert c1_match["deterioration_status"] in ("DETERIORATING", "SIGNIFICANTLY_DETERIORATING")

        # Check curr_unmapped_crack (Must be NEW because location is UNAVAILABLE)
        c2_unmapped = next((c for c in comps if c["current_defect_id"] == curr_unmapped_crack.id), None)
        assert c2_unmapped is not None
        assert c2_unmapped["historical_defect_id"] is None
        assert c2_unmapped["comparison_status"] == "NEW"

        # Check hist_far_crack (Must NOT match curr_crack because 1.1km is far outside 10m threshold)
        far_match = next((c for c in comps if c["historical_defect_id"] == hist_far_crack.id), None)
        assert far_match is not None
        assert far_match["current_defect_id"] is None

    finally:
        db.close()


def test_phase2e_status_classifications_resolved_vs_not_observed():
    """
    Test Phase 2E Status Classifications:
    - UNCHANGED
    - DECREASING
    - RECURRING
    - RESOLVED (when current inspection coverage >= 80%)
    - NOT_OBSERVED (when current inspection coverage < 80%)
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    db = SessionLocal()

    try:
        dam = db.query(Dam).filter(Dam.id == 1).first()
        lat = dam.latitude + 0.002
        lng = dam.longitude + 0.002

        # Historical Inspection
        hist_insp = Inspection(
            inspection_code=f"INSP-ST-H-{int(time.time()*1000)}",
            dam_id=1,
            inspection_type="DRONE_VISUAL",
            inspection_date=datetime.utcnow() - timedelta(days=60),
            status="COMPLETED",
            coverage_percentage=90.0
        )
        db.add(hist_insp)
        db.commit()

        # Defect A: Stable crack (20mm)
        def_a_hist = Defect(
            defect_code=f"DEF-ST-A-H-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=hist_insp.id,
            defect_type="SEEPAGE",
            severity=DefectSeverity.MEDIUM,
            estimated_length_mm=20.0,
            latitude=lat,
            longitude=lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        # Defect B: Decreasing crack (30mm -> 15mm)
        def_b_hist = Defect(
            defect_code=f"DEF-ST-B-H-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=hist_insp.id,
            defect_type="CRACK",
            severity=DefectSeverity.HIGH,
            estimated_length_mm=30.0,
            latitude=lat + 0.00005,
            longitude=lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        # Defect C: Disappeared crack
        def_c_hist = Defect(
            defect_code=f"DEF-ST-C-H-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=hist_insp.id,
            defect_type="CORROSION",
            severity=DefectSeverity.LOW,
            estimated_area_sq_cm=10.0,
            latitude=lat + 0.00010,
            longitude=lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        db.add_all([def_a_hist, def_b_hist, def_c_hist])
        db.commit()

        # Current High Coverage Inspection (85% coverage)
        curr_insp_high = Inspection(
            inspection_code=f"INSP-ST-CH-{int(time.time()*1000)}",
            dam_id=1,
            inspection_type="DRONE_VISUAL",
            inspection_date=datetime.utcnow(),
            status="COMPLETED",
            coverage_percentage=85.0
        )
        db.add(curr_insp_high)
        db.commit()

        def_a_curr = Defect(
            defect_code=f"DEF-ST-A-C-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=curr_insp_high.id,
            defect_type="SEEPAGE",
            severity=DefectSeverity.MEDIUM,
            estimated_length_mm=20.0, # 0 change -> UNCHANGED
            latitude=lat,
            longitude=lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        def_b_curr = Defect(
            defect_code=f"DEF-ST-B-C-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=curr_insp_high.id,
            defect_type="CRACK",
            severity=DefectSeverity.MEDIUM,
            estimated_length_mm=15.0, # 30 -> 15 -> DECREASING
            latitude=lat + 0.00005,
            longitude=lng,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )

        db.add_all([def_a_curr, def_b_curr])
        db.commit()

        # Run comparison with 85% coverage -> def_c_hist missing -> RESOLVED
        res_high = client.get(
            f"/api/v1/historical/inspections/{curr_insp_high.id}/compare?historical_inspection_id={hist_insp.id}",
            headers=engineer_headers
        )
        assert res_high.status_code == 200
        data_high = res_high.json()

        comp_a = next(c for c in data_high["comparisons"] if c["historical_defect_id"] == def_a_hist.id)
        assert comp_a["comparison_status"] == "UNCHANGED"

        comp_b = next(c for c in data_high["comparisons"] if c["historical_defect_id"] == def_b_hist.id)
        assert comp_b["comparison_status"] == "DECREASING"
        assert comp_b["measurement_change_mm"] == -15.0

        comp_c = next(c for c in data_high["comparisons"] if c["historical_defect_id"] == def_c_hist.id)
        assert comp_c["comparison_status"] == "RESOLVED"

        # Now test Low Coverage Inspection (40% coverage) -> def_c_hist missing -> NOT_OBSERVED
        curr_insp_low = Inspection(
            inspection_code=f"INSP-ST-CL-{int(time.time()*1000)}",
            dam_id=1,
            inspection_type="DRONE_VISUAL",
            inspection_date=datetime.utcnow() + timedelta(days=1),
            status="COMPLETED",
            coverage_percentage=40.0
        )
        db.add(curr_insp_low)
        db.commit()

        res_low = client.get(
            f"/api/v1/historical/inspections/{curr_insp_low.id}/compare?historical_inspection_id={hist_insp.id}",
            headers=engineer_headers
        )
        assert res_low.status_code == 200
        data_low = res_low.json()

        comp_c_low = next(c for c in data_low["comparisons"] if c["historical_defect_id"] == def_c_hist.id)
        assert comp_c_low["comparison_status"] == "NOT_OBSERVED"

    finally:
        db.close()


def test_phase2e_defect_history_timeline_and_audit():
    """
    Test Phase 2E Defect Lifecycle History API and Audit Logging.
    """
    engineer_headers = get_auth_headers("engineer@hydrovision.gov.in", "engineer123")
    db = SessionLocal()

    try:
        insp = Inspection(
            inspection_code=f"INSP-AUD-{int(time.time()*1000)}",
            dam_id=1,
            inspection_type="DRONE_VISUAL",
            inspection_date=datetime.utcnow(),
            status="COMPLETED"
        )
        db.add(insp)
        db.commit()

        def_obj = Defect(
            defect_code=f"DEF-AUD-{int(time.time()*1000)}",
            dam_id=1,
            inspection_id=insp.id,
            defect_type="CRACK",
            severity=DefectSeverity.HIGH,
            estimated_length_mm=25.0,
            latitude=9.8500,
            longitude=76.9700,
            coordinate_source="MEDIA_GPS",
            location_precision="PRECISE_SURVEY",
            status=DefectStatus.VERIFIED
        )
        db.add(def_obj)
        db.commit()

        # Call defect history endpoint
        res = client.get(f"/api/v1/historical/defects/{def_obj.id}/history", headers=engineer_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["defect_id"] == def_obj.id
        assert data["history_count"] >= 1
        assert len(data["history"]) >= 1

        # Check Audit Log for DEFECT_HISTORY_VIEWED
        audit = (
            db.query(AuditLog)
            .filter(AuditLog.action == "DEFECT_HISTORY_VIEWED", AuditLog.entity_id == str(def_obj.id))
            .first()
        )
        assert audit is not None
        assert audit.user_id is not None

    finally:
        db.close()

