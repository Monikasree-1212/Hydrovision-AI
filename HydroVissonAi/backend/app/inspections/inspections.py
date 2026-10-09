from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.base import get_db
from app.database.models import Inspection, InspectionStatus, Dam, User, UserRole, AuditLog
from app.schemas.schemas import InspectionCreate, InspectionOut
from app.auth.auth import get_current_user, require_roles

router = APIRouter(prefix="/inspections", tags=["Inspection Management"])

@router.get("", response_model=List[InspectionOut])
def get_inspections(
    dam_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Inspection)
    if dam_id:
        query = query.filter(Inspection.dam_id == dam_id)
    if status:
        query = query.filter(Inspection.status == status)
    
    inspections = query.order_by(Inspection.created_at.desc()).all()
    
    # Map dam names for UI display
    result = []
    for insp in inspections:
        out = InspectionOut.from_orm(insp)
        if insp.dam:
            out.dam_name = insp.dam.name
        result.append(out)
    return result

@router.post("", response_model=InspectionOut, status_code=status.HTTP_201_CREATED)
def create_inspection(
    insp_in: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DAM_OPERATOR, UserRole.INSPECTION_ENGINEER]))
):
    dam = db.query(Dam).filter(Dam.id == insp_in.dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    timestamp_str = datetime.utcnow().strftime("%Y%m%d%H%M")
    code = f"INSP-{dam.code}-{timestamp_str}"

    new_insp = Inspection(
        inspection_code=code,
        dam_id=dam.id,
        zone_id=insp_in.zone_id,
        inspection_type=insp_in.inspection_type,
        assigned_engineer_id=insp_in.assigned_engineer_id or current_user.id,
        status=InspectionStatus.PLANNED,
        weather_conditions=insp_in.weather_conditions or "Clear sky, wind < 10 km/h"
    )
    db.add(new_insp)
    db.commit()
    db.refresh(new_insp)

    # Log audit entry
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="CREATE_INSPECTION",
        entity_type="Inspection",
        entity_id=str(new_insp.id),
        new_value=f"Inspection Code: {code}"
    )
    db.add(audit)
    db.commit()

    out = InspectionOut.from_orm(new_insp)
    out.dam_name = dam.name
    return out

@router.get("/{inspection_id}", response_model=InspectionOut)
def get_inspection(inspection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection record not found.")
    
    out = InspectionOut.from_orm(insp)
    if insp.dam:
        out.dam_name = insp.dam.name
    return out

@router.patch("/{inspection_id}/status", response_model=InspectionOut)
def update_inspection_status(
    inspection_id: int,
    status_str: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection record not found.")

    try:
        insp.status = InspectionStatus(status_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status '{status_str}'")

    db.commit()
    db.refresh(insp)

    out = InspectionOut.from_orm(insp)
    if insp.dam:
        out.dam_name = insp.dam.name
    return out
