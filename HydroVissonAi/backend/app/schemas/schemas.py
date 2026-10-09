from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr
from app.database.models import UserRole, InspectionStatus, DefectStatus, DefectSeverity, MaintenanceStatus

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole
    user_id: int
    full_name: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    department: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# Dam Schemas
class DamZoneBase(BaseModel):
    zone_name: str
    criticality: str = "MEDIUM"
    description: Optional[str] = None

class DamZoneCreate(DamZoneBase):
    pass

class DamZoneOut(DamZoneBase):
    id: int
    dam_id: int

    class Config:
        from_attributes = True

class DamBase(BaseModel):
    name: str
    code: str
    state: str
    district: str
    dam_type: str
    height_meters: float
    length_meters: Optional[float] = None
    storage_capacity_mcm: Optional[float] = None
    river_basin: Optional[str] = None
    commission_year: Optional[int] = None
    latitude: float
    longitude: float
    operator_name: Optional[str] = None
    status: str = "OPERATIONAL"

class DamCreate(DamBase):
    zones: Optional[List[DamZoneCreate]] = []

class DamOut(DamBase):
    id: int
    created_at: datetime
    zones: List[DamZoneOut] = []

    class Config:
        from_attributes = True

# Inspection Schemas
class InspectionCreate(BaseModel):
    dam_id: int
    zone_id: Optional[int] = None
    inspection_type: str = "DRONE_VISUAL"
    assigned_engineer_id: Optional[int] = None
    weather_conditions: Optional[str] = None

class InspectionOut(BaseModel):
    id: int
    inspection_code: str
    dam_id: int
    zone_id: Optional[int]
    inspection_type: str
    assigned_engineer_id: Optional[int]
    inspection_date: datetime
    status: InspectionStatus
    coverage_percentage: float
    weather_conditions: Optional[str]
    created_at: datetime
    dam_name: Optional[str] = None

    class Config:
        from_attributes = True

# Drone Upload & Validation Schemas
class ImageQualityIssue(BaseModel):
    issue_type: str
    description: str

class DroneImageOut(BaseModel):
    id: int
    dataset_id: int
    filename: str
    file_path: str
    storage_key: Optional[str] = None
    storage_provider: Optional[str] = "LOCAL"
    mime_type: Optional[str] = "image/jpeg"
    media_type: Optional[str] = "IMAGE"
    file_size_bytes: int
    file_hash_sha256: Optional[str] = None
    resolution_w: Optional[int] = None
    resolution_h: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    blur_score: Optional[float] = 0.0
    brightness_score: Optional[float] = 0.0
    duration_seconds: Optional[float] = 0.0
    fps: Optional[float] = 0.0
    frame_count: Optional[int] = 0
    gps_status: Optional[str] = "UNAVAILABLE"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    capture_time: Optional[datetime] = None
    georeference_method: Optional[str] = None
    georeferenced_by_id: Optional[int] = None
    georeferenced_at: Optional[datetime] = None
    quality_status: str
    quality_issues: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GeoreferenceRequest(BaseModel):
    latitude: float
    longitude: float
    altitude: Optional[float] = None

class DroneDatasetOut(BaseModel):
    id: int
    inspection_id: int
    dataset_name: str
    drone_model: Optional[str]
    total_files: int
    valid_files: int
    warning_files: int
    rejected_files: int
    upload_status: str
    uploaded_at: datetime
    images: List[DroneImageOut] = []

    class Config:
        from_attributes = True

# AI & Defect Schemas
class AIDetectionOut(BaseModel):
    id: int
    image_id: int
    defect_type: str
    confidence: float
    bbox_x: Optional[float] = None
    bbox_y: Optional[float] = None
    bbox_width: Optional[float] = None
    bbox_height: Optional[float] = None
    bbox_x_min: Optional[float] = None
    bbox_y_min: Optional[float] = None
    bbox_x_max: Optional[float] = None
    bbox_y_max: Optional[float] = None
    review_status: Optional[str] = "AI_DETECTED"
    status: str
    original_defect_type: Optional[str] = None
    original_confidence: Optional[float] = None
    final_defect_type: Optional[str] = None
    final_severity: Optional[str] = None

    class Config:
        from_attributes = True

class DefectVerifyRequest(BaseModel):
    defect_type: Optional[str] = None
    severity: Optional[DefectSeverity] = None
    engineer_comments: Optional[str] = None
    status: DefectStatus = DefectStatus.VERIFIED
    estimated_length_mm: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DefectOut(BaseModel):
    id: int
    defect_code: str
    dam_id: int
    inspection_id: int
    zone_id: Optional[int]
    image_id: Optional[int]
    defect_type: str
    severity: DefectSeverity
    confidence: float
    estimated_length_mm: Optional[float]
    estimated_width_mm: Optional[float]
    estimated_area_sq_cm: Optional[float]
    measurement_type: str
    latitude: Optional[float]
    longitude: Optional[float]
    pos_x_3d: float
    pos_y_3d: float
    pos_z_3d: float
    status: DefectStatus
    engineer_verified_by_id: Optional[int]
    engineer_comments: Optional[str]
    created_at: datetime
    updated_at: datetime
    dam_name: Optional[str] = None
    image_url: Optional[str] = None
    source_detection_id: Optional[int] = None
    ai_detection_id: Optional[int] = None

    class Config:
        from_attributes = True

# Risk & Condition Schemas
class RiskAssessmentOut(BaseModel):
    id: int
    dam_id: int
    inspection_id: Optional[int]
    risk_score: float
    risk_level: str
    condition_index: float
    condition_rating: str
    contributing_factors: Optional[List[str]] = []
    assessed_at: datetime

    class Config:
        from_attributes = True

# Work Order Schemas
class WorkOrderCreate(BaseModel):
    dam_id: int
    defect_id: int
    assigned_manager_id: Optional[int] = None
    priority: str = "HIGH"
    assigned_team: Optional[str] = None
    description: str
    recommended_action: Optional[str] = None
    due_date: Optional[datetime] = None

class WorkOrderUpdate(BaseModel):
    status: Optional[MaintenanceStatus] = None
    repair_notes: Optional[str] = None
    repair_evidence_file: Optional[str] = None
    assigned_team: Optional[str] = None

class WorkOrderOut(BaseModel):
    id: int
    work_order_code: str
    dam_id: int
    defect_id: int
    assigned_manager_id: Optional[int]
    priority: str
    assigned_team: Optional[str]
    description: str
    recommended_action: Optional[str]
    due_date: Optional[datetime]
    status: MaintenanceStatus
    repair_notes: Optional[str]
    repair_evidence_file: Optional[str]
    completion_date: Optional[datetime]
    created_at: datetime
    dam_name: Optional[str] = None
    defect_code: Optional[str] = None

    class Config:
        from_attributes = True

# Report, Alert, Audit Schemas
class ReportOut(BaseModel):
    id: int
    report_code: str
    dam_id: int
    inspection_id: Optional[int]
    generated_by_id: int
    report_title: str
    file_path: str
    generated_at: datetime

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: int
    dam_id: Optional[int]
    defect_id: Optional[int]
    alert_type: str
    severity: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    user_email: Optional[str]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

# Public Complaint Schemas
class PublicComplaintCreate(BaseModel):
    citizen_name: Optional[str] = "Anonymous Citizen"
    citizen_phone: Optional[str] = None
    citizen_email: Optional[str] = None
    dam_id: Optional[int] = None
    category: str # SEEPAGE, STRUCTURAL_CRACK, SPILLWAY_MALFUNCTION, FLOODING_RISK, SILTATION, ENCROACHMENT, OTHER
    title: str
    description: str
    latitude: float
    longitude: float
    location_address: Optional[str] = None
    photo_urls: Optional[List[str]] = []

class PublicComplaintOut(BaseModel):
    id: int
    tracking_code: str
    citizen_name: Optional[str]
    citizen_phone: Optional[str]
    citizen_email: Optional[str]
    dam_id: Optional[int]
    dam_name: Optional[str] = None
    category: str
    title: str
    description: str
    latitude: float
    longitude: float
    location_address: Optional[str]
    photo_urls_json: Optional[Any] = []
    ai_risk_score: float
    status: str
    authority_notes: Optional[str]
    resolution_photo_url: Optional[str]
    work_order_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True

class PublicComplaintAction(BaseModel):
    status: str # UNDER_REVIEW, INSPECTION_ASSIGNED, REPAIR_IN_PROGRESS, RESOLVED, REJECTED
    authority_notes: Optional[str] = None
    resolution_photo_url: Optional[str] = None
    create_work_order: Optional[bool] = False
    work_order_priority: Optional[str] = "HIGH"

