from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.base import get_db
from app.database.models import Dam, Inspection, Defect, DroneImage, AIDetection, User, UserRole, AuditLog
from app.auth.auth import get_current_user, require_roles
from app.gis.schemas import (
  GeoJSONGeometry, DefectGeoJSONProperties, DefectGeoJSONFeature,
  DefectGeoJSONFeatureCollection, DamGISOut, DefectLocationUpdateReq
)

router = APIRouter(prefix="/gis", tags=["GIS & Spatial Defect Intelligence"])

def _build_defect_feature(defect: Defect, db: Session) -> DefectGeoJSONFeature:
    """
    Constructs a standard GeoJSON Feature for a verified engineering Defect.
    Ensures longitude = X, latitude = Y ordering for WGS84 coordinates.
    If spatial coordinates are missing or invalid, geometry is set to None.
    """
    has_valid_coords = (
        defect.latitude is not None and 
        defect.longitude is not None and 
        -90.0 <= defect.latitude <= 90.0 and 
        -180.0 <= defect.longitude <= 180.0
    )

    geometry = None
    if has_valid_coords:
        geometry = GeoJSONGeometry(
            type="Point",
            coordinates=[float(defect.longitude), float(defect.latitude)]
        )

    # Fetch source image url if available
    image_url = None
    source_media = None
    if defect.image_id:
        source_media = db.query(DroneImage).filter(DroneImage.id == defect.image_id).first()
        if source_media:
            if source_media.storage_key:
                image_url = f"/api/v1/uploads/storage/{source_media.storage_key}"
            else:
                image_url = source_media.file_path

    dam = db.query(Dam).filter(Dam.id == defect.dam_id).first()
    inspection = db.query(Inspection).filter(Inspection.id == defect.inspection_id).first()

    props = DefectGeoJSONProperties(
        defect_id=defect.id,
        defect_code=defect.defect_code,
        dam_id=defect.dam_id,
        dam_name=dam.name if dam else None,
        inspection_id=defect.inspection_id,
        inspection_code=inspection.inspection_code if inspection else None,
        defect_type=defect.defect_type,
        severity=defect.severity.value if hasattr(defect.severity, 'value') else str(defect.severity),
        status=defect.status.value if hasattr(defect.status, 'value') else str(defect.status),
        confidence=float(defect.confidence or 0.0),
        location_source=defect.coordinate_source or "UNAVAILABLE",
        location_precision=defect.location_precision or "UNAVAILABLE",
        coordinate_accuracy_meters=defect.coordinate_accuracy_meters,
        latitude=defect.latitude,
        longitude=defect.longitude,
        image_id=defect.image_id,
        image_url=image_url,
        source_detection_id=defect.source_detection_id,
        engineer_comments=defect.engineer_comments,
        created_at=defect.created_at.isoformat() if defect.created_at else datetime.utcnow().isoformat()
    )

    return DefectGeoJSONFeature(
        type="Feature",
        id=defect.id,
        geometry=geometry,
        properties=props
    )

@router.get("/dams/{dam_id}", response_model=DamGISOut)
def get_dam_gis_info(dam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns Dam spatial information and GIS summary metrics.
    """
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam record not found.")

    has_valid_coords = (-90.0 <= dam.latitude <= 90.0 and -180.0 <= dam.longitude <= 180.0)
    geometry = None
    if has_valid_coords:
        geometry = GeoJSONGeometry(
            type="Point",
            coordinates=[float(dam.longitude), float(dam.latitude)]
        )

    all_defects = db.query(Defect).filter(Defect.dam_id == dam_id).all()
    total_defects = len(all_defects)
    mapped_defects = len([d for d in all_defects if d.latitude is not None and d.longitude is not None])

    return DamGISOut(
        id=dam.id,
        name=dam.name,
        code=dam.code,
        latitude=dam.latitude,
        longitude=dam.longitude,
        geometry=geometry,
        location_label=getattr(dam, 'location_label', 'Dam Reference Location') or 'Dam Reference Location',
        state=dam.state,
        district=dam.district,
        dam_type=dam.dam_type,
        height_meters=dam.height_meters,
        total_defects=total_defects,
        spatially_mapped_defects=mapped_defects
    )

@router.get("/inspections/{inspection_id}/defects", response_model=DefectGeoJSONFeatureCollection)
def get_inspection_defects_geojson(
    inspection_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Returns GeoJSON FeatureCollection of verified engineering defects for a specific inspection.
    """
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection record not found.")

    defects = db.query(Defect).filter(Defect.inspection_id == inspection_id).all()
    features = [_build_defect_feature(d, db) for d in defects]

    return DefectGeoJSONFeatureCollection(
        type="FeatureCollection",
        features=features
    )

@router.get("/defects", response_model=DefectGeoJSONFeatureCollection)
def get_defects_geojson_filtered(
    dam_id: Optional[int] = Query(None),
    inspection_id: Optional[int] = Query(None),
    defect_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    coordinate_source: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns GeoJSON FeatureCollection of verified defects matching spatial & technical filters.
    Raw unverified AI detections are strictly excluded from the primary GIS layer.
    """
    query = db.query(Defect)

    if dam_id:
        query = query.filter(Defect.dam_id == dam_id)
    if inspection_id:
        query = query.filter(Defect.inspection_id == inspection_id)
    if defect_type and defect_type.upper() != "ALL":
        query = query.filter(Defect.defect_type == defect_type.upper())
    if severity and severity.upper() != "ALL":
        query = query.filter(Defect.severity == severity.upper())
    if status and status.upper() != "ALL":
        query = query.filter(Defect.status == status.upper())
    if coordinate_source and coordinate_source.upper() != "ALL":
        query = query.filter(Defect.coordinate_source == coordinate_source.upper())

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            query = query.filter(Defect.created_at >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            query = query.filter(Defect.created_at <= dt_to)
        except ValueError:
            pass

    defects = query.all()
    features = [_build_defect_feature(d, db) for d in defects]

    return DefectGeoJSONFeatureCollection(
        type="FeatureCollection",
        features=features
    )

@router.get("/defects/{defect_id}", response_model=DefectGeoJSONFeature)
def get_defect_geojson_by_id(
    defect_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Returns a single defect GeoJSON Feature with full spatial lineage and source image traceability.
    """
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect record not found.")

    return _build_defect_feature(defect, db)

@router.patch("/defects/{defect_id}/location", response_model=DefectGeoJSONFeature)
def update_defect_spatial_location(
    defect_id: int,
    req: DefectLocationUpdateReq,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.INSPECTION_ENGINEER]))
):
    """
    Manual Spatial Georeferencing Endpoint for Inspection Engineers.
    Updates PostGIS geometry and coordinate source with audit trail logging.
    """
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect record not found.")

    if not (-90.0 <= req.latitude <= 90.0):
        raise HTTPException(status_code=400, detail="Latitude must be a valid number between -90 and 90.")

    if not (-180.0 <= req.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Longitude must be a valid number between -180 and 180.")

    old_lat = defect.latitude
    old_lng = defect.longitude
    old_source = defect.coordinate_source

    defect.latitude = req.latitude
    defect.longitude = req.longitude
    defect.geometry = f"POINT({req.longitude} {req.latitude})"
    defect.coordinate_source = "MANUAL"
    defect.location_precision = req.location_precision or "MANUAL_GEOREFERENCE"
    defect.coordinate_accuracy_meters = req.coordinate_accuracy_meters
    defect.updated_at = datetime.utcnow()

    # Log Audit Record
    audit_entry = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DEFECT_LOCATION_UPDATED",
        entity_type="Defect",
        entity_id=str(defect.id),
        old_value=f"lat={old_lat}, lng={old_lng}, source={old_source}",
        new_value=f"lat={req.latitude}, lng={req.longitude}, source=MANUAL, reason={req.reason or 'Manual Georeference'}",
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(defect)

    return _build_defect_feature(defect, db)
