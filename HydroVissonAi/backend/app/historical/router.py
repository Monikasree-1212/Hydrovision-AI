from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.base import get_db
from app.database.models import Dam, Inspection, Defect, DefectComparison, DefectStatus, User, AuditLog, DroneImage
from app.auth.auth import get_current_user
from app.historical.service import (
    compare_inspections_logic,
    is_valid_location,
    calculate_haversine_distance,
    DEFAULT_MATCH_DISTANCE_METERS,
    classify_deterioration_status
)


router = APIRouter(prefix="/historical", tags=["Historical Inspection Comparison Engine"])

def log_audit(db: Session, user: User, action: str, entity_type: str, entity_id: str, new_value: Optional[str] = None):
    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        new_value=new_value,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

@router.get("/dams/{dam_id}/inspections")
def get_dam_inspection_timeline(
    dam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns chronological timeline of inspections for a dam with verified defect metrics.
    """
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    inspections = (
        db.query(Inspection)
        .filter(Inspection.dam_id == dam_id)
        .order_by(Inspection.inspection_date.asc())
        .all()
    )

    timeline = []
    for insp in inspections:
        defects = db.query(Defect).filter(Defect.inspection_id == insp.id).all()
        mapped_count = sum(1 for d in defects if is_valid_location(d))
        unmapped_count = len(defects) - mapped_count

        timeline.append({
            "id": insp.id,
            "inspection_code": insp.inspection_code,
            "inspection_date": insp.inspection_date,
            "inspection_type": insp.inspection_type,
            "status": insp.status.value if hasattr(insp.status, "value") else str(insp.status),
            "coverage_percentage": insp.coverage_percentage,
            "verified_defects": len(defects),
            "spatially_located_defects": mapped_count,
            "unmapped_defects": unmapped_count
        })

    return {
        "dam_id": dam.id,
        "dam_name": dam.name,
        "total_inspections": len(inspections),
        "timeline": timeline
    }

@router.get("/inspections/{inspection_id}/compare")
def compare_inspections(
    inspection_id: int,
    historical_inspection_id: Optional[int] = Query(None, description="Optional ID of historical inspection to compare against"),
    match_distance_meters: float = Query(DEFAULT_MATCH_DISTANCE_METERS, description="Spatial matching radius threshold in meters"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Runs spatial and defect matching between current and previous/historical inspection.
    Enforces strict zero-fake-data safeguards.
    """
    current_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not current_inspection:
        raise HTTPException(status_code=404, detail="Current inspection not found.")

    dam = db.query(Dam).filter(Dam.id == current_inspection.dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Associated dam not found.")

    # Select historical inspection
    if historical_inspection_id is not None:
        historical_inspection = (
            db.query(Inspection)
            .filter(Inspection.id == historical_inspection_id, Inspection.dam_id == dam.id)
            .first()
        )
        if not historical_inspection:
            raise HTTPException(status_code=404, detail="Specified historical inspection not found for this dam.")
    else:
        # Get immediately preceding inspection for this dam
        historical_inspection = (
            db.query(Inspection)
            .filter(
                Inspection.dam_id == dam.id,
                Inspection.id != current_inspection.id,
                Inspection.inspection_date < current_inspection.inspection_date
            )
            .order_by(Inspection.inspection_date.desc())
            .first()
        )

    # 1. Edge Case: No historical inspection exists
    if not historical_inspection:
        log_audit(db, current_user, "HISTORICAL_COMPARISON_RUN", "INSPECTION", inspection_id, f"UNAVAILABLE - No historical inspection")
        return {
            "status": "UNAVAILABLE",
            "message": "HISTORICAL COMPARISON UNAVAILABLE: A previous verified inspection is required for comparison.",
            "current_inspection": {
                "id": current_inspection.id,
                "inspection_code": current_inspection.inspection_code,
                "inspection_date": current_inspection.inspection_date
            },
            "historical_inspection": None,
            "comparisons": [],
            "summary": {
                "total_current_defects": db.query(Defect).filter(Defect.inspection_id == current_inspection.id).count(),
                "total_historical_defects": 0,
                "matched_count": 0,
                "new_count": 0,
                "unchanged_count": 0,
                "increasing_count": 0,
                "decreasing_count": 0,
                "resolved_count": 0,
                "not_observed_count": 0,
                "recurring_count": 0
            }
        }

    # Fetch real defects from database
    current_defects = db.query(Defect).filter(Defect.inspection_id == current_inspection.id).all()
    historical_defects = db.query(Defect).filter(Defect.inspection_id == historical_inspection.id).all()

    # 2. Edge Case: Historical inspection exists but 0 defects or 0 mapped defects
    if len(historical_defects) == 0:
        log_audit(db, current_user, "HISTORICAL_COMPARISON_RUN", "INSPECTION", inspection_id, f"NO_MATCHABLE_DEFECTS - 0 historical defects")
        
        # Build NEW status for current defects
        new_comparisons = []
        for curr in current_defects:
            curr_sev_str = curr.severity.value if hasattr(curr.severity, "value") else str(curr.severity)
            new_comparisons.append({
                "dam_id": dam.id,
                "current_inspection_id": current_inspection.id,
                "historical_inspection_id": historical_inspection.id,
                "current_defect_id": curr.id,
                "historical_defect_id": None,
                "match_method": "UNMATCHED",
                "match_distance_meters": None,
                "match_confidence": None,
                "comparison_status": "NEW",
                "measurement_change_mm": None,
                "measurement_change_pct": None,
                "severity_change": None,
                "deterioration_status": classify_deterioration_status("NEW", None, None, curr_sev_str),
                "current_defect": serialize_defect(curr),
                "historical_defect": None
            })

        return {
            "status": "NO_MATCHABLE_DEFECTS",
            "message": "NO MATCHABLE HISTORICAL DEFECTS: Previous inspection records exist, but spatial comparison is unavailable.",
            "current_inspection": {
                "id": current_inspection.id,
                "inspection_code": current_inspection.inspection_code,
                "inspection_date": current_inspection.inspection_date
            },
            "historical_inspection": {
                "id": historical_inspection.id,
                "inspection_code": historical_inspection.inspection_code,
                "inspection_date": historical_inspection.inspection_date
            },
            "comparisons": new_comparisons,
            "summary": {
                "total_current_defects": len(current_defects),
                "total_historical_defects": 0,
                "matched_count": 0,
                "new_count": len(current_defects),
                "unchanged_count": 0,
                "increasing_count": 0,
                "decreasing_count": 0,
                "resolved_count": 0,
                "not_observed_count": 0,
                "recurring_count": 0
            }
        }

    # 3. Perform real comparison matching logic
    res = compare_inspections_logic(
        current_inspection,
        historical_inspection,
        current_defects,
        historical_defects,
        match_distance_meters
    )

    # Format comparisons payload with serialized defect objects
    serialized_comparisons = []
    for c in res["comparisons"]:
        curr_obj = c["current_defect"]
        hist_obj = c["historical_defect"]
        
        serialized_comparisons.append({
            "dam_id": c["dam_id"],
            "current_inspection_id": c["current_inspection_id"],
            "historical_inspection_id": c["historical_inspection_id"],
            "current_defect_id": c["current_defect_id"],
            "historical_defect_id": c["historical_defect_id"],
            "match_method": c["match_method"],
            "match_distance_meters": c["match_distance_meters"],
            "match_confidence": c["match_confidence"],
            "comparison_status": c["comparison_status"],
            "measurement_change_mm": c["measurement_change_mm"],
            "measurement_change_pct": c["measurement_change_pct"],
            "severity_change": c["severity_change"],
            "deterioration_status": c["deterioration_status"],
            "current_defect": serialize_defect(curr_obj) if curr_obj else None,
            "historical_defect": serialize_defect(hist_obj) if hist_obj else None
        })

    # Log audit
    log_audit(
        db, current_user, "HISTORICAL_COMPARISON_RUN", "INSPECTION", inspection_id,
        f"Compared current={inspection_id} with historical={historical_inspection.id}, radius={match_distance_meters}m"
    )

    return {
        "status": "SUCCESS",
        "message": "Historical comparison computed successfully from verified database records.",
        "current_inspection": {
            "id": current_inspection.id,
            "inspection_code": current_inspection.inspection_code,
            "inspection_date": current_inspection.inspection_date,
            "coverage_percentage": current_inspection.coverage_percentage
        },
        "historical_inspection": {
            "id": historical_inspection.id,
            "inspection_code": historical_inspection.inspection_code,
            "inspection_date": historical_inspection.inspection_date,
            "coverage_percentage": historical_inspection.coverage_percentage
        },
        "match_distance_meters": match_distance_meters,
        "summary": {
            "total_current_defects": res["total_current_defects"],
            "total_historical_defects": res["total_historical_defects"],
            "matched_count": res["matched_count"],
            "new_count": res["new_count"],
            "unchanged_count": res["unchanged_count"],
            "increasing_count": res["increasing_count"],
            "decreasing_count": res["decreasing_count"],
            "resolved_count": res["resolved_count"],
            "not_observed_count": res["not_observed_count"],
            "recurring_count": res["recurring_count"]
        },
        "comparisons": serialized_comparisons
    }

@router.get("/defects/{defect_id}/history")
def get_defect_history(
    defect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns complete multi-inspection defect lifecycle history for a defect across inspections of a dam.
    """
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found.")

    dam_id = defect.dam_id
    
    # Get all inspections for this dam ordered chronologically
    inspections = (
        db.query(Inspection)
        .filter(Inspection.dam_id == dam_id)
        .order_by(Inspection.inspection_date.asc())
        .all()
    )

    history_nodes = []

    # Find matching defects across inspections
    for insp in inspections:
        insp_defects = db.query(Defect).filter(Defect.inspection_id == insp.id).all()
        
        # Check direct match or spatial + type match
        matched_def = None
        for d in insp_defects:
            if d.id == defect.id or d.defect_code == defect.defect_code:
                matched_def = d
                break
            elif is_valid_location(d) and is_valid_location(defect):
                if (d.defect_type or "").upper() == (defect.defect_type or "").upper():
                    dist = calculate_haversine_distance(defect.latitude, defect.longitude, d.latitude, d.longitude)
                    if dist <= DEFAULT_MATCH_DISTANCE_METERS:
                        matched_def = d
                        break

        if matched_def:
            history_nodes.append({
                "inspection_id": insp.id,
                "inspection_code": insp.inspection_code,
                "inspection_date": insp.inspection_date,
                "defect_id": matched_def.id,
                "defect_code": matched_def.defect_code,
                "defect_type": matched_def.defect_type,
                "severity": matched_def.severity.value if hasattr(matched_def.severity, "value") else str(matched_def.severity),
                "estimated_length_mm": matched_def.estimated_length_mm,
                "estimated_width_mm": matched_def.estimated_width_mm,
                "estimated_area_sq_cm": matched_def.estimated_area_sq_cm,
                "measurement_type": matched_def.measurement_type or "ESTIMATED",
                "latitude": matched_def.latitude,
                "longitude": matched_def.longitude,
                "coordinate_source": matched_def.coordinate_source,
                "location_precision": matched_def.location_precision,
                "status": matched_def.status.value if hasattr(matched_def.status, "value") else str(matched_def.status),
                "source_image_id": matched_def.image_id
            })

    log_audit(db, current_user, "DEFECT_HISTORY_VIEWED", "DEFECT", defect_id, f"Viewed defect history timeline ({len(history_nodes)} entries)")

    curr_sev_str = defect.severity.value if hasattr(defect.severity, "value") else str(defect.severity)

    return {
        "defect_id": defect.id,
        "defect_code": defect.defect_code,
        "defect_type": defect.defect_type,
        "dam_id": dam_id,
        "current_severity": curr_sev_str,
        "location_precision": defect.location_precision,
        "history_count": len(history_nodes),
        "history": history_nodes
    }

@router.get("/dams/{dam_id}/summary")
def get_dam_historical_summary(
    dam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns dam-level historical inspection and defect aggregation metrics.
    """
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    inspections = db.query(Inspection).filter(Inspection.dam_id == dam_id).order_by(Inspection.inspection_date.desc()).all()
    
    if not inspections:
        return {
            "dam_id": dam_id,
            "total_historical_inspections": 0,
            "current_inspection": None,
            "total_defects": 0,
            "summary": {
                "new_count": 0,
                "unchanged_count": 0,
                "increasing_count": 0,
                "decreasing_count": 0,
                "resolved_count": 0,
                "not_observed_count": 0,
                "recurring_count": 0
            }
        }

    current_inspection = inspections[0]
    historical_inspection = inspections[1] if len(inspections) > 1 else None

    current_defects = db.query(Defect).filter(Defect.inspection_id == current_inspection.id).all()
    historical_defects = db.query(Defect).filter(Defect.inspection_id == historical_inspection.id).all() if historical_inspection else []

    if historical_inspection:
        comp_res = compare_inspections_logic(current_inspection, historical_inspection, current_defects, historical_defects)
        summary = {
            "new_count": comp_res["new_count"],
            "unchanged_count": comp_res["unchanged_count"],
            "increasing_count": comp_res["increasing_count"],
            "decreasing_count": comp_res["decreasing_count"],
            "resolved_count": comp_res["resolved_count"],
            "not_observed_count": comp_res["not_observed_count"],
            "recurring_count": comp_res["recurring_count"]
        }
    else:
        summary = {
            "new_count": len(current_defects),
            "unchanged_count": 0,
            "increasing_count": 0,
            "decreasing_count": 0,
            "resolved_count": 0,
            "not_observed_count": 0,
            "recurring_count": 0
        }

    log_audit(db, current_user, "HISTORICAL_COMPARISON_VIEWED", "DAM", dam_id, "Viewed dam-level historical summary")

    return {
        "dam_id": dam_id,
        "dam_name": dam.name,
        "total_historical_inspections": len(inspections),
        "current_inspection": {
            "id": current_inspection.id,
            "inspection_code": current_inspection.inspection_code,
            "inspection_date": current_inspection.inspection_date
        },
        "historical_inspection": {
            "id": historical_inspection.id,
            "inspection_code": historical_inspection.inspection_code,
            "inspection_date": historical_inspection.inspection_date
        } if historical_inspection else None,
        "current_defects_count": len(current_defects),
        "historical_defects_count": len(historical_defects),
        "summary": summary
    }

def serialize_defect(defect: Optional[Defect]) -> Optional[Dict[str, Any]]:
    if not defect:
        return None
    return {
        "id": defect.id,
        "defect_code": defect.defect_code,
        "dam_id": defect.dam_id,
        "inspection_id": defect.inspection_id,
        "defect_type": defect.defect_type,
        "severity": defect.severity.value if hasattr(defect.severity, "value") else str(defect.severity),
        "confidence": defect.confidence,
        "estimated_length_mm": defect.estimated_length_mm,
        "estimated_width_mm": defect.estimated_width_mm,
        "estimated_area_sq_cm": defect.estimated_area_sq_cm,
        "measurement_type": defect.measurement_type or "ESTIMATED",
        "latitude": defect.latitude,
        "longitude": defect.longitude,
        "coordinate_source": defect.coordinate_source,
        "location_precision": defect.location_precision,
        "pos_x_3d": defect.pos_x_3d,
        "pos_y_3d": defect.pos_y_3d,
        "pos_z_3d": defect.pos_z_3d,
        "status": defect.status.value if hasattr(defect.status, "value") else str(defect.status),
        "image_id": defect.image_id,
        "source_detection_id": defect.source_detection_id,
        "created_at": defect.created_at
    }
