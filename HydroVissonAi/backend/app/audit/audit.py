from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.base import get_db
from app.database.models import AuditLog, User, UserRole
from app.schemas.schemas import AuditLogOut
from app.auth.auth import get_current_user, require_roles

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=List[AuditLogOut])
def get_audit_trail(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.AUTHORITY, UserRole.MAINTENANCE_MANAGER]))
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
