import math
import random
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.database.models import PublicComplaint, Dam, MaintenanceWorkOrder, UserRole, User, Defect, DefectSeverity, DefectStatus, MaintenanceStatus, Inspection
from app.auth.auth import require_roles

router = APIRouter(prefix="", tags=["Public Grievance Portal & Authority Integration"])

# --- Pydantic Schemas ---
class PublicComplaintCreate(BaseModel):
    citizen_name: str
    citizen_phone: str
    citizen_email: Optional[str] = None
    dam_id: Optional[int] = None
    category: str # SEEPAGE, STRUCTURAL_CRACK, SPILLWAY_MALFUNCTION, FLOODING_RISK, SILTATION, ENCROACHMENT, OTHER
    title: str
    description: str
    latitude: float
    longitude: float
    location_address: Optional[str] = None
    photo_urls_json: Optional[List[str]] = []

class PublicComplaintOut(BaseModel):
    id: int
    tracking_code: str
    citizen_name: Optional[str] = None
    citizen_phone: Optional[str] = None
    citizen_email: Optional[str] = None
    dam_id: Optional[int] = None
    dam_name: Optional[str] = None
    category: str
    title: str
    description: str
    latitude: float
    longitude: float
    location_address: Optional[str] = None
    photo_urls_json: Optional[List[str]] = []
    ai_risk_score: float
    status: str
    authority_notes: Optional[str] = None
    resolution_photo_url: Optional[str] = None
    work_order_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    distance_to_dam_km: Optional[float] = None

    class Config:
        from_attributes = True

class DamPublicRef(BaseModel):
    id: int
    name: str
    code: str
    state: str
    district: str
    latitude: float
    longitude: float
    dam_type: str

    class Config:
        from_attributes = True

class AuthorityActionRequest(BaseModel):
    status: Optional[str] = None
    authority_notes: Optional[str] = None
    resolution_photo_url: Optional[str] = None
    assign_work_order: Optional[bool] = False
    work_order_priority: Optional[str] = "HIGH"

# --- Helper Functions ---
def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def compute_ai_risk_score(category: str, title: str, description: str, photos: Optional[List[str]]) -> float:
    base_weights = {
        "FLOODING_RISK": 85.0,
        "SPILLWAY_MALFUNCTION": 80.0,
        "SEEPAGE": 75.0,
        "STRUCTURAL_CRACK": 70.0,
        "SILTATION": 50.0,
        "ENCROACHMENT": 45.0,
        "OTHER": 40.0
    }
    score = base_weights.get(category.upper(), 50.0)
    text = f"{title} {description}".lower()

    keywords = {
        "crack": 8.0,
        "seepage": 10.0,
        "breach": 15.0,
        "leak": 8.0,
        "overflow": 12.0,
        "collapse": 15.0,
        "failure": 15.0,
        "erosion": 7.0,
        "hazard": 5.0,
        "emergency": 15.0,
        "danger": 10.0
    }
    for kw, bonus in keywords.items():
        if kw in text:
            score += bonus

    if photos and len(photos) > 0:
        score += 5.0

    return round(min(100.0, max(10.0, score)), 1)

def format_complaint_out(c: PublicComplaint, db: Session) -> PublicComplaintOut:
    dam_name = None
    dist_km = None
    if c.dam_id:
        dam = db.query(Dam).filter(Dam.id == c.dam_id).first()
        if dam:
            dam_name = dam.name
            dist_km = round(calculate_haversine_distance(c.latitude, c.longitude, dam.latitude, dam.longitude), 2)
    
    return PublicComplaintOut(
        id=c.id,
        tracking_code=c.tracking_code,
        citizen_name=c.citizen_name,
        citizen_phone=c.citizen_phone,
        citizen_email=c.citizen_email,
        dam_id=c.dam_id,
        dam_name=dam_name,
        category=c.category,
        title=c.title,
        description=c.description,
        latitude=c.latitude,
        longitude=c.longitude,
        location_address=c.location_address,
        photo_urls_json=c.photo_urls_json or [],
        ai_risk_score=c.ai_risk_score or 50.0,
        status=c.status or "SUBMITTED",
        authority_notes=c.authority_notes,
        resolution_photo_url=c.resolution_photo_url,
        work_order_id=c.work_order_id,
        created_at=c.created_at,
        updated_at=c.updated_at,
        resolved_at=c.resolved_at,
        distance_to_dam_km=dist_km
    )

# --- Public Endpoints (No Auth Required) ---
@router.post("/public/complaints", response_model=PublicComplaintOut, status_code=status.HTTP_201_CREATED)
def submit_public_complaint(
    payload: PublicComplaintCreate,
    db: Session = Depends(get_db)
):
    # Generate unique tracking code
    rand_suffix = random.randint(1000, 9999)
    tracking_code = f"GRV-{datetime.utcnow().year}-{rand_suffix}"

    # Auto-spatial matching to nearest Dam within 50km if dam_id not provided
    matched_dam_id = payload.dam_id
    if not matched_dam_id:
        dams = db.query(Dam).all()
        min_dist = float("inf")
        nearest_dam = None
        for d in dams:
            dist = calculate_haversine_distance(payload.latitude, payload.longitude, d.latitude, d.longitude)
            if dist < min_dist:
                min_dist = dist
                nearest_dam = d
        
        if nearest_dam and min_dist <= 50.0:
            matched_dam_id = nearest_dam.id

    # Compute AI risk score
    risk_score = compute_ai_risk_score(payload.category, payload.title, payload.description, payload.photo_urls_json)

    complaint = PublicComplaint(
        tracking_code=tracking_code,
        citizen_name=payload.citizen_name,
        citizen_phone=payload.citizen_phone,
        citizen_email=payload.citizen_email,
        dam_id=matched_dam_id,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_address=payload.location_address,
        photo_urls_json=payload.photo_urls_json or [],
        ai_risk_score=risk_score,
        status="SUBMITTED",
        created_at=datetime.utcnow()
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    return format_complaint_out(complaint, db)

@router.get("/public/complaints/track/{tracking_code}", response_model=PublicComplaintOut)
def track_public_complaint(
    tracking_code: str,
    db: Session = Depends(get_db)
):
    c = db.query(PublicComplaint).filter(PublicComplaint.tracking_code == tracking_code.strip()).first()
    if not c:
        raise HTTPException(
            status_code=404,
            detail=f"No grievance record found for tracking code '{tracking_code}'."
        )
    return format_complaint_out(c, db)

@router.get("/public/dams", response_model=List[DamPublicRef])
def get_public_dams(
    db: Session = Depends(get_db)
):
    dams = db.query(Dam).order_by(Dam.name).all()
    return dams


# --- Authority Endpoints (JWT Required: AUTHORITY / SUPREME_COMMAND) ---
@router.get("/authority/grievances", response_model=List[PublicComplaintOut])
def get_authority_grievances(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    dam_id_filter: Optional[int] = Query(None, alias="dam_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.AUTHORITY, UserRole.SUPREME_COMMAND]))
):
    query = db.query(PublicComplaint)
    if status_filter:
        query = query.filter(PublicComplaint.status == status_filter)
    if category_filter:
        query = query.filter(PublicComplaint.category == category_filter)
    if dam_id_filter:
        query = query.filter(PublicComplaint.dam_id == dam_id_filter)

    complaints = query.order_by(PublicComplaint.created_at.desc()).all()
    return [format_complaint_out(c, db) for c in complaints]

@router.patch("/authority/grievances/{complaint_id}/action", response_model=PublicComplaintOut)
def authority_grievance_action(
    complaint_id: int,
    payload: AuthorityActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.AUTHORITY, UserRole.SUPREME_COMMAND]))
):
    c = db.query(PublicComplaint).filter(PublicComplaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Grievance complaint not found.")

    if payload.status:
        c.status = payload.status
        if payload.status == "RESOLVED":
            c.resolved_at = datetime.utcnow()

    if payload.authority_notes:
        c.authority_notes = payload.authority_notes

    if payload.resolution_photo_url:
        c.resolution_photo_url = payload.resolution_photo_url

    # Auto-assign or generate Work Order if requested
    if payload.assign_work_order and not c.work_order_id and c.dam_id:
        # Create a maintenance work order for linked dam
        wo_code = f"WO-GRV-{datetime.utcnow().year}-{random.randint(100, 999)}"
        
        # Check if dam has defects or auto-create verified defect from citizen complaint
        sample_defect = db.query(Defect).filter(Defect.dam_id == c.dam_id).first()
        if not sample_defect:
            # Locate or create inspection reference for dam
            sample_insp = db.query(Inspection).filter(Inspection.dam_id == c.dam_id).order_by(Inspection.id.desc()).first()
            if not sample_insp:
                insp_code = f"INSP-GRV-{c.dam_id}-{datetime.utcnow().strftime('%Y%m%d')}"
                sample_insp = Inspection(
                    inspection_code=insp_code,
                    dam_id=c.dam_id,
                    inspection_type="PUBLIC_GRIEVANCE_SURVEY",
                    status="COMPLETED",
                    created_at=datetime.utcnow()
                )
                db.add(sample_insp)
                db.commit()
                db.refresh(sample_insp)

            defect_code = f"DEF-GRV-{c.id:03d}-{random.randint(10, 99)}"
            defect_type_mapped = c.category if c.category in ["CRACK", "CORROSION", "SEEPAGE", "SPALLING", "EROSION", "VEGETATION"] else "SEEPAGE"
            sample_defect = Defect(
                defect_code=defect_code,
                dam_id=c.dam_id,
                inspection_id=sample_insp.id,
                defect_type=defect_type_mapped,
                severity=DefectSeverity.HIGH if (c.ai_risk_score or 50) >= 70 else DefectSeverity.MEDIUM,
                status=DefectStatus.VERIFIED,
                latitude=c.latitude,
                longitude=c.longitude,
                engineer_comments=f"Citizen Grievance ({c.tracking_code}): {c.location_address or c.title}",
                created_at=datetime.utcnow()
            )
            db.add(sample_defect)
            db.commit()
            db.refresh(sample_defect)

        new_wo = MaintenanceWorkOrder(
            work_order_code=wo_code,
            dam_id=c.dam_id,
            defect_id=sample_defect.id,
            priority=payload.work_order_priority or "HIGH",
            description=f"Citizen Grievance Action ({c.tracking_code}): {c.title}",
            recommended_action=f"Authority Instructions: {payload.authority_notes or c.description}",
            status=MaintenanceStatus.ASSIGNED,
            created_at=datetime.utcnow()
        )
        db.add(new_wo)
        db.commit()
        db.refresh(new_wo)

        c.work_order_id = new_wo.id
        if not payload.status:
            c.status = "REPAIR_IN_PROGRESS"

    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)

    return format_complaint_out(c, db)
