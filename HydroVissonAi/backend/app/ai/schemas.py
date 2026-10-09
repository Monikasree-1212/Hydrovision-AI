from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.database.models import DefectSeverity

class ModelStatusOut(BaseModel):
    status: str
    model_name: Optional[str] = None
    model_version: Optional[str] = "UNKNOWN"
    supported_classes: List[str] = ["CRACK", "CORROSION", "SEEPAGE"]
    device: str = "cpu"
    confidence_threshold: float = 0.50
    iou_threshold: float = 0.45
    model_path: Optional[str] = None
    reason: Optional[str] = None

class AIJobOut(BaseModel):
    id: int
    job_code: str
    inspection_id: int
    media_id: Optional[int] = None
    job_type: str
    status: str
    model_name: Optional[str] = None
    model_version: Optional[str] = "1.0.0"
    total_media: int
    eligible_media: int
    skipped_media: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AIDetectionOut(BaseModel):
    id: int
    detection_code: str
    ai_job_id: Optional[int] = None
    inspection_id: int
    media_id: int
    image_id: int
    dam_id: int
    defect_type: str
    confidence: float
    bbox_x_min: float
    bbox_y_min: float
    bbox_x_max: float
    bbox_y_max: float
    bbox_x: Optional[float] = None
    bbox_y: Optional[float] = None
    bbox_width: Optional[float] = None
    bbox_height: Optional[float] = None
    model_name: Optional[str] = None
    model_version: str = "UNKNOWN"
    inference_timestamp: datetime
    review_status: str
    status: str
    original_defect_type: Optional[str] = None
    original_confidence: Optional[float] = None
    original_bbox: Optional[str] = None
    final_defect_type: Optional[str] = None
    final_severity: Optional[str] = None
    final_bbox: Optional[str] = None
    annotated_image_key: Optional[str] = None
    reviewed_by_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DefectReviewRequest(BaseModel):
    action: str  # ACCEPT, REJECT, EDIT
    defect_type: Optional[str] = None
    severity: Optional[DefectSeverity] = DefectSeverity.MEDIUM
    bbox_x_min: Optional[float] = None
    bbox_y_min: Optional[float] = None
    bbox_x_max: Optional[float] = None
    bbox_y_max: Optional[float] = None
    engineer_comments: Optional[str] = None

class BatchAnalysisSummaryOut(BaseModel):
    job_id: int
    job_code: str
    status: str
    total_media: int
    eligible_media: int
    skipped_media: int
    created_detections: int
    message: str
