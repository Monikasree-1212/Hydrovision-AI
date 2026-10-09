from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class DigitalTwinModelOut(BaseModel):
    id: int
    dam_id: int
    name: str
    description: Optional[str] = None
    file_name: str
    storage_key: str
    storage_provider: str = "LOCAL"
    file_size_bytes: int
    mime_type: str
    model_format: str
    version: str
    is_active: bool
    uploaded_by_id: int
    uploader_name: Optional[str] = None
    download_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DigitalTwinDefectOverlayOut(BaseModel):
    defect_id: int
    defect_code: str
    defect_type: str
    severity: str
    inspection_id: int
    inspection_code: Optional[str] = None
    inspection_date: Optional[datetime] = None
    location_source: str
    location_precision: str
    position_available: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    coordinate_accuracy_meters: Optional[float] = None
    position_3d: Dict[str, float]
    ai_detection_confidence: float
    source_image_id: Optional[int] = None
    source_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    status: str
    verification_date: Optional[datetime] = None
    verified_by_name: Optional[str] = None

    class Config:
        from_attributes = True

class DigitalTwinSummaryOut(BaseModel):
    dam_id: int
    dam_name: str
    dam_code: str
    dam_type: str
    height_meters: float
    length_meters: Optional[float] = None
    latitude: float
    longitude: float
    has_active_model: bool
    active_model: Optional[DigitalTwinModelOut] = None
    total_models: int
    total_defects: int
    spatially_located_defects: int
    missing_location_defects: int
    defects: List[DigitalTwinDefectOverlayOut] = []

    class Config:
        from_attributes = True

class DigitalTwinActivateResponse(BaseModel):
    model_id: int
    dam_id: int
    is_active: bool
    message: str

class DigitalTwinHealthOut(BaseModel):
    model_id: int
    dam_id: int
    exists: bool
    storage_accessible: bool
    file_size_bytes: int
    sha256_checksum: Optional[str] = None
    format: str
    mime_type: str
    glb_valid: bool
    validation_status: str
    load_ready: bool
    reason: Optional[str] = None

