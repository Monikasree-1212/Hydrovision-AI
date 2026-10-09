import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum as SQLEnum, Boolean, JSON, Index
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship
from app.database.base import Base

try:
    from geoalchemy2 import Geometry
except ImportError:
    Geometry = None

class PostGISPointType(TypeDecorator):
    """
    SQLAlchemy spatial point type decorator.
    Compiles to PostGIS GEOMETRY('POINT', 4326) on PostgreSQL and TEXT on SQLite.
    """
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and Geometry is not None:
            return dialect.type_descriptor(Geometry('POINT', srid=4326))
        return dialect.type_descriptor(Text())

class UserRole(str, enum.Enum):
    AUTHORITY = "AUTHORITY"
    DAM_OPERATOR = "DAM_OPERATOR"
    INSPECTION_ENGINEER = "INSPECTION_ENGINEER"
    MAINTENANCE_MANAGER = "MAINTENANCE_MANAGER"
    SUPREME_COMMAND = "SUPREME_COMMAND"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.AUTHORITY)
    department = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Dam(Base):
    __tablename__ = "dams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(100), unique=True, index=True, nullable=False)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    dam_type = Column(String(100), nullable=False) # Concrete Gravity, Embankment, Arch, Earthen, etc.
    dam_category = Column(String(50), default="MAJOR") # MAJOR, MEDIUM, MINOR
    height_meters = Column(Float, nullable=False)
    length_meters = Column(Float, nullable=True)
    storage_capacity_mcm = Column(Float, nullable=True) # Million Cubic Meters
    river_basin = Column(String(255), nullable=True)
    commission_year = Column(Integer, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geometry = Column(PostGISPointType(), nullable=True)
    location_label = Column(String(100), default="Dam Reference Location")
    operator_name = Column(String(255), nullable=True)
    engineer_in_charge = Column(String(255), nullable=True)
    history_summary = Column(Text, nullable=True)
    photos_json = Column(JSON, nullable=True) # Array of photo URL strings / metadata
    supreme_rating = Column(Float, default=4.5) # 1.0 to 5.0 rating
    rating_grade = Column(String(10), default="A") # A+, A, B, C, D
    rating_comments = Column(Text, nullable=True)
    status = Column(String(50), default="OPERATIONAL") # OPERATIONAL, UNDER_MAINTENANCE, RESTRICTED
    created_at = Column(DateTime, default=datetime.utcnow)

    zones = relationship("DamZone", back_populates="dam", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="dam", cascade="all, delete-orphan")
    defects = relationship("Defect", back_populates="dam", cascade="all, delete-orphan")
    work_orders = relationship("MaintenanceWorkOrder", back_populates="dam", cascade="all, delete-orphan")
    digital_twin_models = relationship("DigitalTwinModel", back_populates="dam", cascade="all, delete-orphan")
    directives = relationship("SupremeCommandDirective", back_populates="dam", cascade="all, delete-orphan")

class SupremeCommandDirective(Base):
    __tablename__ = "supreme_command_directives"

    id = Column(Integer, primary_key=True, index=True)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    directive_code = Column(String(100), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    command_text = Column(Text, nullable=False)
    priority = Column(String(50), default="HIGH") # URGENT, HIGH, MEDIUM, ROUTINE
    status = Column(String(50), default="ISSUED") # ISSUED, ACKNOWLEDGED, IN_PROGRESS, COMPLETED
    issued_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    issued_at = Column(DateTime, default=datetime.utcnow)
    target_completion_date = Column(DateTime, nullable=True)

    dam = relationship("Dam", back_populates="directives")
    issued_by = relationship("User", foreign_keys=[issued_by_id])

class DamZone(Base):
    __tablename__ = "dam_zones"

    id = Column(Integer, primary_key=True, index=True)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    zone_name = Column(String(100), nullable=False) # Upstream Face, Downstream Face, Spillway, Crest, Gallery, Stilling Basin
    criticality = Column(String(50), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=True)

    dam = relationship("Dam", back_populates="zones")

class InspectionStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    SCHEDULED = "SCHEDULED"
    DATA_UPLOADED = "DATA_UPLOADED"
    VALIDATING = "VALIDATING"
    AI_PROCESSING = "AI_PROCESSING"
    ENGINEER_REVIEW = "ENGINEER_REVIEW"
    CONDITION_ASSESSED = "CONDITION_ASSESSED"
    RISK_ASSESSED = "RISK_ASSESSED"
    REPORT_GENERATED = "REPORT_GENERATED"
    COMPLETED = "COMPLETED"

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    inspection_code = Column(String(100), unique=True, index=True, nullable=False)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("dam_zones.id"), nullable=True)
    inspection_type = Column(String(100), default="DRONE_VISUAL") # DRONE_VISUAL, THERMAL, MULTISPECTRAL, REINSPECTION
    assigned_engineer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    inspection_date = Column(DateTime, default=datetime.utcnow)
    status = Column(SQLEnum(InspectionStatus), default=InspectionStatus.PLANNED)
    coverage_percentage = Column(Float, default=0.0)
    weather_conditions = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dam = relationship("Dam", back_populates="inspections")
    engineer = relationship("User", foreign_keys=[assigned_engineer_id])
    datasets = relationship("DroneDataset", back_populates="inspection", cascade="all, delete-orphan")
    defects = relationship("Defect", back_populates="inspection", cascade="all, delete-orphan")

class DroneDataset(Base):
    __tablename__ = "drone_datasets"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    dataset_name = Column(String(255), nullable=False)
    drone_model = Column(String(100), nullable=True)
    total_files = Column(Integer, default=0)
    valid_files = Column(Integer, default=0)
    warning_files = Column(Integer, default=0)
    rejected_files = Column(Integer, default=0)
    upload_status = Column(String(50), default="COMPLETED")
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    inspection = relationship("Inspection", back_populates="datasets")
    images = relationship("DroneImage", back_populates="dataset", cascade="all, delete-orphan")

class DroneImage(Base):
    __tablename__ = "drone_images"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("drone_datasets.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=True)

    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_path = Column(String(512), nullable=False)
    storage_key = Column(String(512), nullable=True, index=True)
    storage_provider = Column(String(50), default="LOCAL")
    mime_type = Column(String(100), default="image/jpeg")
    media_type = Column(String(50), default="IMAGE") # IMAGE, VIDEO

    file_size_bytes = Column(Integer, nullable=False)
    file_hash_sha256 = Column(String(64), nullable=True, index=True)

    resolution_w = Column(Integer, nullable=True)
    resolution_h = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    blur_score = Column(Float, default=0.0)
    brightness_score = Column(Float, default=0.0)

    # Video parameters
    duration_seconds = Column(Float, default=0.0)
    fps = Column(Float, default=0.0)
    frame_count = Column(Integer, default=0)

    # GPS and EXIF
    gps_status = Column(String(50), default="UNAVAILABLE") # EXIF_EXTRACTED, MANUALLY_GEOREFERENCED, UNAVAILABLE, INVALID
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)

    camera_make = Column(String(100), nullable=True)
    camera_model = Column(String(100), nullable=True)
    capture_time = Column(DateTime, nullable=True)

    # Manual Georeferencing Audit
    georeference_method = Column(String(50), nullable=True) # MANUAL, EXIF
    georeferenced_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    georeferenced_at = Column(DateTime, nullable=True)

    quality_status = Column(String(50), default="VALID") # VALID, WARNING, REJECTED
    quality_issues = Column(Text, nullable=True) # JSON list of issues
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dataset = relationship("DroneDataset", back_populates="images")
    ai_detections = relationship("AIDetection", foreign_keys="[AIDetection.media_id]", back_populates="image", cascade="all, delete-orphan")

class AIJob(Base):
    __tablename__ = "ai_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_code = Column(String(100), unique=True, index=True, nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    media_id = Column(Integer, ForeignKey("drone_images.id"), nullable=True)
    job_type = Column(String(50), default="INSPECTION_BATCH") # BATCH, SINGLE_IMAGE
    status = Column(String(50), default="QUEUED") # QUEUED, RUNNING, COMPLETED, FAILED, MODEL_UNAVAILABLE
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), default="1.0.0")
    total_media = Column(Integer, default=0)
    eligible_media = Column(Integer, default=0)
    skipped_media = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    detections = relationship("AIDetection", back_populates="ai_job", cascade="all, delete-orphan")

class AIDetection(Base):
    __tablename__ = "ai_detections"

    id = Column(Integer, primary_key=True, index=True)
    detection_code = Column(String(100), unique=True, index=True, nullable=False) # e.g. DET-000001
    ai_job_id = Column(Integer, ForeignKey("ai_jobs.id"), nullable=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    media_id = Column(Integer, ForeignKey("drone_images.id"), nullable=False)
    image_id = Column(Integer, ForeignKey("drone_images.id"), nullable=False)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)

    defect_type = Column(String(100), nullable=False) # CRACK, CORROSION, SEEPAGE
    confidence = Column(Float, nullable=False)

    # Pixel coordinates bounding box
    bbox_x_min = Column(Float, nullable=False)
    bbox_y_min = Column(Float, nullable=False)
    bbox_x_max = Column(Float, nullable=False)
    bbox_y_max = Column(Float, nullable=False)
    
    # Legacy bbox compatibility
    bbox_x = Column(Float, nullable=True)
    bbox_y = Column(Float, nullable=True)
    bbox_width = Column(Float, nullable=True)
    bbox_height = Column(Float, nullable=True)

    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), default="UNKNOWN")
    inference_timestamp = Column(DateTime, default=datetime.utcnow)

    review_status = Column(String(50), default="AI_DETECTED") # AI_DETECTED, UNDER_REVIEW, ACCEPTED, REJECTED, EDITED
    status = Column(String(50), default="AI_DETECTED")

    # Original AI Data Preservation
    original_defect_type = Column(String(100), nullable=True)
    original_confidence = Column(Float, nullable=True)
    original_bbox = Column(Text, nullable=True) # JSON string [x_min, y_min, x_max, y_max]

    # Final Engineer Decision Data
    final_defect_type = Column(String(100), nullable=True)
    final_severity = Column(String(50), nullable=True)
    final_bbox = Column(Text, nullable=True)

    annotated_image_key = Column(String(512), nullable=True)

    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    image = relationship("DroneImage", foreign_keys=[media_id], back_populates="ai_detections")
    ai_job = relationship("AIJob", back_populates="detections")
    verified_defect = relationship("Defect", foreign_keys="[Defect.source_detection_id]", back_populates="source_detection", uselist=False)

class DefectStatus(str, enum.Enum):
    AI_DETECTED = "AI_DETECTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    RISK_ASSESSED = "RISK_ASSESSED"
    MAINTENANCE_REQUIRED = "MAINTENANCE_REQUIRED"
    WORK_ORDER_CREATED = "WORK_ORDER_CREATED"
    REPAIR_IN_PROGRESS = "REPAIR_IN_PROGRESS"
    REPAIR_COMPLETED = "REPAIR_COMPLETED"
    REINSPECTION = "REINSPECTION"
    RESOLVED = "RESOLVED"
    MONITOR = "MONITOR"

class DefectSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    defect_code = Column(String(100), unique=True, index=True, nullable=False) # e.g. DEF-101-01
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("dam_zones.id"), nullable=True)
    image_id = Column(Integer, ForeignKey("drone_images.id"), nullable=True)
    ai_detection_id = Column(Integer, ForeignKey("ai_detections.id"), nullable=True)
    source_detection_id = Column(Integer, ForeignKey("ai_detections.id"), nullable=True)
    
    defect_type = Column(String(100), nullable=False)
    severity = Column(SQLEnum(DefectSeverity), default=DefectSeverity.MEDIUM)
    confidence = Column(Float, default=0.0)
    
    # Estimated OpenCV measurements
    estimated_length_mm = Column(Float, nullable=True)
    estimated_width_mm = Column(Float, nullable=True)
    estimated_area_sq_cm = Column(Float, nullable=True)
    measurement_type = Column(String(50), default="ESTIMATED") # ESTIMATED, CALIBRATED
    
    # Coordinates (Spatial PostGIS ready)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geometry = Column(PostGISPointType(), nullable=True)
    coordinate_source = Column(String(50), default="UNAVAILABLE") # MEDIA_GPS, MANUAL, PRECISE_SURVEY, UNAVAILABLE
    location_precision = Column(String(50), default="UNAVAILABLE") # MEDIA_REFERENCE, MANUAL_GEOREFERENCE, PRECISE_SURVEY, UNAVAILABLE
    coordinate_accuracy_meters = Column(Float, nullable=True)
    spatial_zone_code = Column(String(100), nullable=True)
    
    # 3D Coordinates
    pos_x_3d = Column(Float, default=0.0)
    pos_y_3d = Column(Float, default=0.0)
    pos_z_3d = Column(Float, default=0.0)
    
    status = Column(SQLEnum(DefectStatus), default=DefectStatus.AI_DETECTED)
    engineer_verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    engineer_comments = Column(Text, nullable=True)
    verification_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dam = relationship("Dam", back_populates="defects")
    inspection = relationship("Inspection", back_populates="defects")
    verified_by = relationship("User", foreign_keys=[engineer_verified_by_id])
    source_detection = relationship("AIDetection", foreign_keys=[source_detection_id], back_populates="verified_defect")
    history = relationship("DefectHistory", back_populates="defect", cascade="all, delete-orphan")
    work_orders = relationship("MaintenanceWorkOrder", back_populates="defect")

class DefectHistory(Base):
    __tablename__ = "defect_history"

    id = Column(Integer, primary_key=True, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    severity = Column(String(50), nullable=False)
    estimated_length_mm = Column(Float, nullable=True)
    status = Column(String(50), nullable=False)
    change_trend = Column(String(50), default="UNCHANGED") # NEW, UNCHANGED, INCREASING, DECREASING, RESOLVED
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    defect = relationship("Defect", back_populates="history")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    risk_score = Column(Float, nullable=False) # 0 to 100
    risk_level = Column(String(50), nullable=False) # LOW, MODERATE, HIGH, CRITICAL
    condition_index = Column(Float, nullable=False) # 0 to 100
    condition_rating = Column(String(50), nullable=False) # GOOD, WATCH, ATTENTION_REQUIRED, CRITICAL
    contributing_factors = Column(JSON, nullable=True) # List of factor strings
    assessed_at = Column(DateTime, default=datetime.utcnow)

class MaintenanceStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    REPAIR_COMPLETED = "REPAIR_COMPLETED"
    REINSPECTION_REQUIRED = "REINSPECTION_REQUIRED"
    CLOSED = "CLOSED"

class MaintenanceWorkOrder(Base):
    __tablename__ = "maintenance_work_orders"

    id = Column(Integer, primary_key=True, index=True)
    work_order_code = Column(String(100), unique=True, index=True, nullable=False) # WO-2025-001
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=False)
    assigned_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    priority = Column(String(50), default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    assigned_team = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    
    due_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(MaintenanceStatus), default=MaintenanceStatus.OPEN)
    
    repair_notes = Column(Text, nullable=True)
    repair_evidence_file = Column(String(512), nullable=True)
    completion_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    dam = relationship("Dam", back_populates="work_orders")
    defect = relationship("Defect", back_populates="work_orders")
    manager = relationship("User", foreign_keys=[assigned_manager_id])
    reinspections = relationship("Reinspection", back_populates="work_order", cascade="all, delete-orphan")

class Reinspection(Base):
    __tablename__ = "reinspections"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("maintenance_work_orders.id"), nullable=False)
    engineer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    result_status = Column(String(50), default="PENDING") # PENDING, RESOLVED, MONITOR, REPAIR_FAILED
    findings_notes = Column(Text, nullable=True)

    work_order = relationship("MaintenanceWorkOrder", back_populates="reinspections")
    engineer = relationship("User", foreign_keys=[engineer_id])

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_code = Column(String(100), unique=True, index=True, nullable=False)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    generated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_title = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=True)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=True)
    alert_type = Column(String(100), nullable=False) # CRITICAL_DEFECT, HIGH_RISK, INSPECTION_OVERDUE, MAINTENANCE_OVERDUE
    severity = Column(String(50), default="HIGH")
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False) # LOGIN, CREATE_DAM, UPLOAD_DRONE_DATA, VERIFY_DEFECT, CREATE_WORK_ORDER, GENERATE_REPORT
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class DigitalTwinModel(Base):
    __tablename__ = "digital_twin_models"

    id = Column(Integer, primary_key=True, index=True)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False, index=True)
    storage_provider = Column(String(50), default="LOCAL")
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), default="model/gltf-binary")
    model_format = Column(String(20), nullable=False, default="GLB") # GLB or GLTF
    version = Column(String(50), nullable=False, default="v1.0.0")
    is_active = Column(Boolean, default=False, nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dam = relationship("Dam", back_populates="digital_twin_models")
    uploader = relationship("User", foreign_keys=[uploaded_by_id])

class DefectComparison(Base):
    __tablename__ = "defect_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=False)
    current_inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    historical_inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    current_defect_id = Column(Integer, ForeignKey("defects.id"), nullable=True)
    historical_defect_id = Column(Integer, ForeignKey("defects.id"), nullable=True)
    match_method = Column(String(50), default="UNMATCHED") # SPATIAL_AND_TYPE, ZONE_AND_TYPE, UNMATCHED
    match_distance_meters = Column(Float, nullable=True)
    match_confidence = Column(Float, nullable=True)
    comparison_status = Column(String(50), nullable=False) # NEW, UNCHANGED, INCREASING, DECREASING, RESOLVED, NOT_OBSERVED, RECURRING
    measurement_change_mm = Column(Float, nullable=True)
    measurement_change_pct = Column(Float, nullable=True)
    severity_change = Column(String(100), nullable=True)
    deterioration_status = Column(String(50), nullable=True) # STABLE, MONITORING, DETERIORATING, SIGNIFICANTLY_DETERIORATING
    created_at = Column(DateTime, default=datetime.utcnow)

    current_defect = relationship("Defect", foreign_keys=[current_defect_id])
    historical_defect = relationship("Defect", foreign_keys=[historical_defect_id])
    current_inspection = relationship("Inspection", foreign_keys=[current_inspection_id])
    historical_inspection = relationship("Inspection", foreign_keys=[historical_inspection_id])
    dam = relationship("Dam")


class PublicComplaint(Base):
    __tablename__ = "public_complaints"

    id = Column(Integer, primary_key=True, index=True)
    tracking_code = Column(String(50), unique=True, index=True, nullable=False)
    citizen_name = Column(String(255), nullable=True)
    citizen_phone = Column(String(50), nullable=True)
    citizen_email = Column(String(255), nullable=True)
    dam_id = Column(Integer, ForeignKey("dams.id"), nullable=True)
    category = Column(String(100), nullable=False) # SEEPAGE, STRUCTURAL_CRACK, SPILLWAY_MALFUNCTION, FLOODING_RISK, SILTATION, ENCROACHMENT, OTHER
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_address = Column(String(500), nullable=True)
    photo_urls_json = Column(JSON, nullable=True)
    ai_risk_score = Column(Float, default=50.0) # 0 to 100 risk score
    status = Column(String(50), default="SUBMITTED") # SUBMITTED, UNDER_REVIEW, INSPECTION_ASSIGNED, REPAIR_IN_PROGRESS, RESOLVED, REJECTED
    authority_notes = Column(Text, nullable=True)
    resolution_photo_url = Column(String(500), nullable=True)
    work_order_id = Column(Integer, ForeignKey("maintenance_work_orders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    dam = relationship("Dam")
    work_order = relationship("MaintenanceWorkOrder")



