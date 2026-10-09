from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.base import get_db
from app.database.models import (
    MaintenanceWorkOrder, MaintenanceStatus, Reinspection, 
    Defect, DefectStatus, Dam, User, UserRole, AuditLog
)
from app.schemas.schemas import WorkOrderCreate, WorkOrderUpdate, WorkOrderOut
from app.auth.auth import get_current_user, require_roles

router = APIRouter(prefix="/maintenance", tags=["Maintenance Work Orders & Reinspection"])

@router.get("/work-orders", response_model=List[WorkOrderOut])
def get_work_orders(
    dam_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MaintenanceWorkOrder)
    if dam_id:
        query = query.filter(MaintenanceWorkOrder.dam_id == dam_id)
    if status:
        query = query.filter(MaintenanceWorkOrder.status == status)

    wos = query.order_by(MaintenanceWorkOrder.created_at.desc()).all()

    result = []
    for w in wos:
        out = WorkOrderOut.from_orm(w)
        if w.dam:
            out.dam_name = w.dam.name
        if w.defect:
            out.defect_code = w.defect.defect_code
        result.append(out)
    return result

@router.post("/work-orders", response_model=WorkOrderOut, status_code=status.HTTP_201_CREATED)
def create_work_order(
    req: WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MAINTENANCE_MANAGER]))
):
    defect = db.query(Defect).filter(Defect.id == req.defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found.")

    wo_count = db.query(MaintenanceWorkOrder).count() + 1
    code = f"WO-{datetime.utcnow().year}-{wo_count:03d}"

    wo = MaintenanceWorkOrder(
        work_order_code=code,
        dam_id=req.dam_id,
        defect_id=req.defect_id,
        assigned_manager_id=current_user.id,
        priority=req.priority,
        assigned_team=req.assigned_team or "Civil Structural Maintenance Team A",
        description=req.description,
        recommended_action=req.recommended_action or "Polyurethane resin injection & epoxy sealing",
        due_date=req.due_date,
        status=MaintenanceStatus.OPEN
    )
    db.add(wo)

    # Update defect status to WORK_ORDER_CREATED
    defect.status = DefectStatus.WORK_ORDER_CREATED
    db.commit()
    db.refresh(wo)

    # Log audit entry
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="CREATE_WORK_ORDER",
        entity_type="MaintenanceWorkOrder",
        entity_id=str(wo.id),
        new_value=f"Work Order: {code} for Defect {defect.defect_code}"
    )
    db.add(audit)
    db.commit()

    out = WorkOrderOut.from_orm(wo)
    if wo.dam:
        out.dam_name = wo.dam.name
    out.defect_code = defect.defect_code
    return out

@router.patch("/work-orders/{wo_id}", response_model=WorkOrderOut)
def update_work_order(
    wo_id: int,
    req: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MAINTENANCE_MANAGER]))
):
    wo = db.query(MaintenanceWorkOrder).filter(MaintenanceWorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found.")

    if req.status:
        wo.status = req.status
        if req.status == MaintenanceStatus.REPAIR_COMPLETED:
            wo.completion_date = datetime.utcnow()
            if wo.defect:
                wo.defect.status = DefectStatus.REPAIR_COMPLETED
    if req.repair_notes:
        wo.repair_notes = req.repair_notes
    if req.repair_evidence_file:
        wo.repair_evidence_file = req.repair_evidence_file
    if req.assigned_team:
        wo.assigned_team = req.assigned_team

    db.commit()
    db.refresh(wo)

    out = WorkOrderOut.from_orm(wo)
    if wo.dam:
        out.dam_name = wo.dam.name
    if wo.defect:
        out.defect_code = wo.defect.defect_code
    return out

@router.post("/reinspection")
def request_reinspection(
    work_order_id: int,
    findings_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MAINTENANCE_MANAGER, UserRole.INSPECTION_ENGINEER]))
):
    wo = db.query(MaintenanceWorkOrder).filter(MaintenanceWorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found.")

    reinsp = Reinspection(
        work_order_id=wo.id,
        engineer_id=current_user.id,
        requested_at=datetime.utcnow(),
        result_status="PENDING",
        findings_notes=findings_notes
    )
    db.add(reinsp)

    wo.status = MaintenanceStatus.REINSPECTION_REQUIRED
    if wo.defect:
        wo.defect.status = DefectStatus.REINSPECTION

    db.commit()
    db.refresh(reinsp)

    return {"message": "Reinspection requested successfully.", "reinspection_id": reinsp.id, "work_order_code": wo.work_order_code}
