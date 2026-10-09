from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.base import get_db
from app.database.models import (
    Defect, DefectStatus, DefectHistory, Dam, Inspection, 
    User, UserRole, AuditLog
)
from app.schemas.schemas import DefectOut, DefectVerifyRequest
from app.auth.auth import get_current_user, require_roles

router = APIRouter(prefix="/defects", tags=["Defect Lifecycle Management"])

@router.get("", response_model=List[DefectOut])
def get_defects(
    dam_id: Optional[int] = Query(None),
    inspection_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Defect)
    if dam_id:
        query = query.filter(Defect.dam_id == dam_id)
    if inspection_id:
        query = query.filter(Defect.inspection_id == inspection_id)
    if status:
        query = query.filter(Defect.status == status)
    if severity:
        query = query.filter(Defect.severity == severity)

    defects = query.order_by(Defect.created_at.desc()).all()

    result = []
    for d in defects:
        out = DefectOut.from_orm(d)
        if d.dam:
            out.dam_name = d.dam.name
        result.append(out)
    return result

@router.get("/{defect_id}", response_model=DefectOut)
def get_defect(defect_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Defect).filter(Defect.id == defect_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect record not found.")

    out = DefectOut.from_orm(d)
    if d.dam:
        out.dam_name = d.dam.name
    return out

@router.patch("/{defect_id}/verify", response_model=DefectOut)
def verify_defect(
    defect_id: int,
    req: DefectVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.INSPECTION_ENGINEER]))
):
    d = db.query(Defect).filter(Defect.id == defect_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect record not found.")

    old_status = d.status.value if hasattr(d.status, "value") else str(d.status)

    if req.defect_type:
        d.defect_type = req.defect_type
    if req.severity:
        d.severity = req.severity
    if req.estimated_length_mm is not None:
        d.estimated_length_mm = req.estimated_length_mm
    if req.latitude is not None:
        d.latitude = req.latitude
    if req.longitude is not None:
        d.longitude = req.longitude
    if req.engineer_comments:
        d.engineer_comments = req.engineer_comments

    d.status = req.status
    d.engineer_verified_by_id = current_user.id
    d.verification_date = datetime.utcnow()

    # Record historical snapshot
    hist = DefectHistory(
        defect_id=d.id,
        inspection_id=d.inspection_id,
        severity=d.severity.value if hasattr(d.severity, "value") else str(d.severity),
        estimated_length_mm=d.estimated_length_mm,
        status=d.status.value if hasattr(d.status, "value") else str(d.status),
        change_trend="NEW" if old_status == "AI_DETECTED" else "UNCHANGED",
        notes=f"Verified by Engineer {current_user.full_name}: {req.engineer_comments or 'No comment'}"
    )
    db.add(hist)
    db.commit()
    db.refresh(d)

    # Log audit entry
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="VERIFY_DEFECT",
        entity_type="Defect",
        entity_id=str(d.id),
        old_value=f"Status: {old_status}",
        new_value=f"Status: {d.status.value if hasattr(d.status, 'value') else d.status}, Severity: {d.severity}"
    )
    db.add(audit)
    db.commit()

    out = DefectOut.from_orm(d)
    if d.dam:
        out.dam_name = d.dam.name
    return out

@router.get("/{defect_id}/evolution")
def get_defect_evolution(
    defect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    d = db.query(Defect).filter(Defect.id == defect_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect record not found.")

    # Historical timeline snapshots
    history_records = db.query(DefectHistory).filter(DefectHistory.defect_id == defect_id).order_by(DefectHistory.recorded_at.asc()).all()

    snapshots = []
    for rec in history_records:
        snapshots.append({
            "period": f"Record #{rec.id}",
            "date": rec.recorded_at.strftime("%Y-%m-%d") if rec.recorded_at else datetime.utcnow().strftime("%Y-%m-%d"),
            "length_mm": rec.estimated_length_mm or d.estimated_length_mm,
            "status": rec.status,
            "severity": rec.severity,
            "notes": rec.notes
        })

    return {
        "defect_id": d.id,
        "defect_code": d.defect_code,
        "defect_type": d.defect_type.value if hasattr(d.defect_type, "value") else str(d.defect_type),
        "severity": d.severity.value if hasattr(d.severity, "value") else str(d.severity),
        "status": d.status.value if hasattr(d.status, "value") else str(d.status),
        "current_length_mm": d.estimated_length_mm,
        "timeline": snapshots
    }

