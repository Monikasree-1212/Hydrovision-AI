from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.base import get_db
from app.database.models import Dam, Defect, MaintenanceWorkOrder, Alert, User, UserRole, SupremeCommandDirective, Inspection
from app.auth.auth import get_current_user, require_roles

router = APIRouter(prefix="/supreme", tags=["Supreme Command Portal"])

# Schemas
class DirectiveCreateIn(BaseModel):
    title: str
    command_text: str
    priority: str = "HIGH" # URGENT, HIGH, MEDIUM, ROUTINE

class RatingSubmitIn(BaseModel):
    rating: float # 1.0 to 5.0
    grade: str # A+, A, B, C, D
    comments: Optional[str] = None

@router.get("/hierarchy")
def get_supreme_national_hierarchy(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPREME_COMMAND, UserRole.AUTHORITY]))
):
    """
    Returns state-wise and district-wise hierarchy of all Indian dams with capacity and issue metrics.
    """
    all_dams = db.query(Dam).all()
    state_map = {}

    for d in all_dams:
        st = d.state or "Other State"
        if st not in state_map:
            state_map[st] = {
                "state": st,
                "total_dams": 0,
                "major_dams": 0,
                "minor_dams": 0,
                "districts_set": set(),
                "total_storage_mcm": 0.0,
                "critical_issues": 0
            }

        state_map[st]["total_dams"] += 1
        if (d.dam_category or "MAJOR").upper() == "MAJOR":
            state_map[st]["major_dams"] += 1
        else:
            state_map[st]["minor_dams"] += 1

        if d.district:
            state_map[st]["districts_set"].add(d.district)

        if d.storage_capacity_mcm:
            state_map[st]["total_storage_mcm"] += d.storage_capacity_mcm

    hierarchy = []
    for st, val in sorted(state_map.items()):
        hierarchy.append({
            "state": val["state"],
            "total_dams": val["total_dams"],
            "major_dams": val["major_dams"],
            "minor_dams": val["minor_dams"],
            "districts": sorted(list(val["districts_set"])),
            "total_storage_mcm": round(val["total_storage_mcm"], 1)
        })

    # Summary Stats
    total_dams_national = len(all_dams)
    major_count = sum(1 for d in all_dams if (d.dam_category or "MAJOR").upper() == "MAJOR")
    minor_count = total_dams_national - major_count
    total_alerts = db.query(Alert).count()
    total_directives = db.query(SupremeCommandDirective).count()

    return {
        "summary": {
            "total_states": len(state_map),
            "total_dams": total_dams_national,
            "major_dams": major_count,
            "minor_dams": minor_count,
            "active_alerts": total_alerts,
            "issued_directives": total_directives,
            "command_authority": "National Dam Safety Inspectorate — Supreme Command HQ"
        },
        "states": hierarchy
    }

@router.get("/dams")
def get_supreme_dams_list(
    state: Optional[str] = None,
    district: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPREME_COMMAND, UserRole.AUTHORITY]))
):
    query = db.query(Dam)

    if state and state != "ALL":
        query = query.filter(Dam.state == state)
    if district and district != "ALL":
        query = query.filter(Dam.district == district)
    if category and category != "ALL":
        query = query.filter(Dam.dam_category == category)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Dam.name.ilike(term)) | (Dam.code.ilike(term)) | (Dam.river_basin.ilike(term))
        )

    dams = query.order_by(Dam.state.asc(), Dam.name.asc()).all()

    result = []
    for d in dams:
        issue_count = db.query(Defect).filter(Defect.dam_id == d.id).count()
        directive_count = db.query(SupremeCommandDirective).filter(SupremeCommandDirective.dam_id == d.id).count()
        result.append({
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "state": d.state,
            "district": d.district,
            "dam_type": d.dam_type,
            "dam_category": d.dam_category or "MAJOR",
            "height_meters": d.height_meters,
            "length_meters": d.length_meters,
            "storage_capacity_mcm": d.storage_capacity_mcm,
            "river_basin": d.river_basin,
            "commission_year": d.commission_year,
            "latitude": d.latitude,
            "longitude": d.longitude,
            "operator_name": d.operator_name,
            "engineer_in_charge": d.engineer_in_charge or "Chief Dam Safety Engineer",
            "status": d.status,
            "supreme_rating": d.supreme_rating or 4.5,
            "rating_grade": d.rating_grade or "A",
            "active_issues_count": issue_count,
            "active_directives_count": directive_count,
            "photos_json": d.photos_json or []
        })

    return result

@router.get("/dams/{dam_id}/dossier")
def get_supreme_dam_dossier(
    dam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPREME_COMMAND, UserRole.AUTHORITY]))
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam record not found.")

    defects = db.query(Defect).filter(Defect.dam_id == dam_id).all()
    alerts = db.query(Alert).filter(Alert.dam_id == dam_id).all()
    work_orders = db.query(MaintenanceWorkOrder).filter(MaintenanceWorkOrder.dam_id == dam_id).all()
    directives = db.query(SupremeCommandDirective).filter(SupremeCommandDirective.dam_id == dam_id).order_by(SupremeCommandDirective.issued_at.desc()).all()
    inspections = db.query(Inspection).filter(Inspection.dam_id == dam_id).order_by(Inspection.inspection_date.desc()).all()

    formatted_directives = []
    for dir_item in directives:
        issued_by_name = dir_item.issued_by.full_name if dir_item.issued_by else "Supreme Command HQ"
        formatted_directives.append({
            "id": dir_item.id,
            "directive_code": dir_item.directive_code,
            "title": dir_item.title,
            "command_text": dir_item.command_text,
            "priority": dir_item.priority,
            "status": dir_item.status,
            "issued_at": dir_item.issued_at,
            "issued_by_name": issued_by_name
        })

    photos = dam.photos_json or []

    history = dam.history_summary or f"{dam.name} is a major strategic infrastructure asset located in {dam.district}, {dam.state}. Commissioned in {dam.commission_year or 2005}, it plays a critical role in irrigation, hydro power generation, and flood control along the {dam.river_basin or 'Narmada'} river basin."

    return {
        "dam": {
            "id": dam.id,
            "name": dam.name,
            "code": dam.code,
            "state": dam.state,
            "district": dam.district,
            "dam_type": dam.dam_type,
            "dam_category": dam.dam_category or "MAJOR",
            "height_meters": dam.height_meters,
            "length_meters": dam.length_meters,
            "storage_capacity_mcm": dam.storage_capacity_mcm,
            "river_basin": dam.river_basin,
            "commission_year": dam.commission_year,
            "latitude": dam.latitude,
            "longitude": dam.longitude,
            "location_label": dam.location_label,
            "operator_name": dam.operator_name,
            "engineer_in_charge": dam.engineer_in_charge or "Chief Dam Safety Engineer",
            "history_summary": history,
            "status": dam.status,
            "supreme_rating": dam.supreme_rating or 4.5,
            "rating_grade": dam.rating_grade or "A",
            "rating_comments": dam.rating_comments or "Structure maintains high operational readiness.",
            "photos": photos
        },
        "registered_issues": {
            "total_defects": len(defects),
            "critical_defects": sum(1 for df in defects if str(df.severity).upper() in ["CRITICAL", "HIGH"]),
            "active_alerts": len(alerts),
            "work_orders": len(work_orders),
            "alerts_list": [
                {
                    "id": a.id,
                    "title": a.alert_title if hasattr(a, 'alert_title') else "Structural Alert",
                    "severity": str(a.severity if hasattr(a, 'severity') else "HIGH"),
                    "created_at": a.created_at
                } for a in alerts[:5]
            ]
        },
        "inspections_history": [
            {
                "id": insp.id,
                "inspection_code": insp.inspection_code,
                "inspection_type": insp.inspection_type,
                "status": str(insp.status),
                "date": insp.inspection_date
            } for insp in inspections[:5]
        ],
        "directives": formatted_directives
    }

@router.post("/dams/{dam_id}/directives")
def issue_supreme_command_directive(
    dam_id: int,
    payload: DirectiveCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPREME_COMMAND]))
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam record not found.")

    dir_count = db.query(SupremeCommandDirective).count() + 1
    code = f"DIR-SC-{datetime.utcnow().year}-{dir_count:04d}"

    directive = SupremeCommandDirective(
        dam_id=dam.id,
        directive_code=code,
        title=payload.title,
        command_text=payload.command_text,
        priority=payload.priority.upper(),
        status="ISSUED",
        issued_by_id=current_user.id,
        issued_at=datetime.utcnow()
    )
    db.add(directive)
    db.commit()
    db.refresh(directive)

    return {
        "status": "SUCCESS",
        "message": f"Supreme Command Directive {code} successfully issued for {dam.name}.",
        "directive": {
            "id": directive.id,
            "directive_code": directive.directive_code,
            "title": directive.title,
            "command_text": directive.command_text,
            "priority": directive.priority,
            "issued_at": directive.issued_at
        }
    }

@router.post("/dams/{dam_id}/rating")
def submit_supreme_dam_rating(
    dam_id: int,
    payload: RatingSubmitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPREME_COMMAND]))
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam record not found.")

    rating_val = max(1.0, min(5.0, payload.rating))
    dam.supreme_rating = rating_val
    dam.rating_grade = payload.grade.upper()
    if payload.comments:
        dam.rating_comments = payload.comments

    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Official Supreme Command rating updated for {dam.name}: {rating_val}/5.0 (Grade {dam.rating_grade}).",
        "dam_id": dam.id,
        "supreme_rating": dam.supreme_rating,
        "rating_grade": dam.rating_grade
    }
