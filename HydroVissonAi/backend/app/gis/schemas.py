from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class GeoJSONGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]

class DefectGeoJSONProperties(BaseModel):
    defect_id: int
    defect_code: str
    dam_id: int
    dam_name: Optional[str] = None
    inspection_id: int
    inspection_code: Optional[str] = None
    defect_type: str
    severity: str
    status: str
    confidence: float
    location_source: str = "UNAVAILABLE"
    location_precision: str = "UNAVAILABLE"
    coordinate_accuracy_meters: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_id: Optional[int] = None
    image_url: Optional[str] = None
    source_detection_id: Optional[int] = None
    engineer_comments: Optional[str] = None
    created_at: str

class DefectGeoJSONFeature(BaseModel):
    type: str = "Feature"
    id: int
    geometry: Optional[GeoJSONGeometry] = None
    properties: DefectGeoJSONProperties

class DefectGeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[DefectGeoJSONFeature]

class DamGISOut(BaseModel):
    id: int
    name: str
    code: str
    latitude: float
    longitude: float
    geometry: Optional[GeoJSONGeometry] = None
    location_label: str = "Dam Reference Location"
    state: str
    district: str
    dam_type: str
    height_meters: float
    total_defects: int = 0
    spatially_mapped_defects: int = 0

    class Config:
        from_attributes = True

class DefectLocationUpdateReq(BaseModel):
    latitude: float
    longitude: float
    location_precision: Optional[str] = "MANUAL_GEOREFERENCE"
    coordinate_accuracy_meters: Optional[float] = None
    reason: Optional[str] = None
