import os
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from sqlalchemy.orm import Session
from app.config import settings
from app.database.base import get_db
from app.database.models import Inspection, InspectionStatus, DroneDataset, DroneImage, User, UserRole, AuditLog
from app.schemas.schemas import DroneDatasetOut, DroneImageOut, GeoreferenceRequest
from app.auth.auth import get_current_user, require_roles
from app.uploads.storage_engine import storage_engine
from app.uploads.exif_engine import exif_engine
from app.uploads.quality_engine import quality_engine

router = APIRouter(prefix="/uploads", tags=["Drone Data Uploads"])

MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB limit per file
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "mp4"}

@router.post("/inspections/{inspection_id}/upload-batch", response_model=DroneDatasetOut, status_code=status.HTTP_201_CREATED)
@router.post("/inspections/{inspection_id}/upload", response_model=DroneDatasetOut, status_code=status.HTTP_201_CREATED)
@router.post("/inspections/{inspection_id}", response_model=DroneDatasetOut, status_code=status.HTTP_201_CREATED)
@router.post("/inspection/{inspection_id}/upload-batch", response_model=DroneDatasetOut, status_code=status.HTTP_201_CREATED)
@router.post("/inspection/{inspection_id}/upload", response_model=DroneDatasetOut, status_code=status.HTTP_201_CREATED)
@router.post("/inspection/{inspection_id}", response_model=DroneDatasetOut, status_code=status.HTTP_201_CREATED)
async def upload_drone_data(
    inspection_id: int,
    dataset_name: str = Form("Drone Surface Survey"),
    drone_model: str = Form("DJI Matrice 300 RTK"),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.INSPECTION_ENGINEER, UserRole.DAM_OPERATOR]))
):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection with ID {inspection_id} not found.")

    if insp.status in [InspectionStatus.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inspection {insp.inspection_code} is already completed/closed and cannot accept new drone dataset uploads."
        )

    if not files or len(files) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files were provided for upload.")

    dam_code = insp.dam.code if insp.dam else f"DAM{insp.dam_id}"
    inspection_code = insp.inspection_code

    dataset = DroneDataset(
        inspection_id=insp.id,
        dataset_name=dataset_name,
        drone_model=drone_model,
        upload_status="PROCESSING"
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    total_count = len(files)
    valid_count = 0
    warning_count = 0
    rejected_count = 0

    for file in files:
        filename = file.filename or "uploaded_file.bin"
        ext = filename.split(".")[-1].lower() if "." in filename else ""

        if ext not in ALLOWED_EXTENSIONS:
            rejected_count += 1
            issues = [f"UNSUPPORTED_FORMAT: Extension .{ext} is not supported. Allowed formats: JPG, JPEG, PNG, MP4."]
            img_obj = DroneImage(
                dataset_id=dataset.id,
                filename=filename,
                file_path="",
                storage_key=None,
                storage_provider=storage_engine.provider,
                mime_type="application/octet-stream",
                media_type="UNKNOWN",
                file_size_bytes=0,
                quality_status="REJECTED",
                quality_issues=json.dumps(issues)
            )
            db.add(img_obj)
            continue

        content = await file.read()
        file_size = len(content)
        if file_size == 0:
            rejected_count += 1
            issues = ["EMPTY_FILE: File content is 0 bytes."]
            img_obj = DroneImage(
                dataset_id=dataset.id,
                filename=filename,
                file_path="",
                storage_key=None,
                storage_provider=storage_engine.provider,
                mime_type="application/octet-stream",
                media_type="IMAGE" if ext != "mp4" else "VIDEO",
                file_size_bytes=0,
                quality_status="REJECTED",
                quality_issues=json.dumps(issues)
            )
            db.add(img_obj)
            continue

        if file_size > MAX_FILE_SIZE_BYTES:
            rejected_count += 1
            issues = [f"FILE_TOO_LARGE: Size {file_size / (1024*1024):.1f} MB exceeds limit of {MAX_FILE_SIZE_BYTES / (1024*1024):.0f} MB."]
            img_obj = DroneImage(
                dataset_id=dataset.id,
                filename=filename,
                file_path="",
                storage_key=None,
                storage_provider=storage_engine.provider,
                mime_type="video/mp4" if ext == "mp4" else f"image/{'png' if ext == 'png' else 'jpeg'}",
                media_type="VIDEO" if ext == "mp4" else "IMAGE",
                file_size_bytes=file_size,
                quality_status="REJECTED",
                quality_issues=json.dumps(issues)
            )
            db.add(img_obj)
            continue

        # 1. SHA-256 Content Hash Calculation
        sha256_hash = quality_engine.calculate_sha256(content)

        # 2. SHA-256 Duplicate Check against Database
        existing_duplicate = (
            db.query(DroneImage)
            .join(DroneDataset)
            .filter(
                DroneDataset.inspection_id == insp.id,
                DroneImage.file_hash_sha256 == sha256_hash
            )
            .first()
        )

        # 3. Storage Key Generation & Physical Upload
        mime_type = "video/mp4" if ext == "mp4" else f"image/{'png' if ext == 'png' else 'jpeg'}"
        storage_key = storage_engine.generate_storage_key(dam_code, inspection_code, sha256_hash, filename)
        saved_key = storage_engine.upload(content, storage_key, mime_type)

        if not storage_engine.exists(saved_key):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Storage error: Unable to verify written file '{filename}' in object storage."
            )

        stored_bytes = storage_engine.download(saved_key)
        if not stored_bytes or quality_engine.calculate_sha256(stored_bytes) != sha256_hash:
            storage_engine.delete(saved_key)
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Storage integrity error: SHA-256 hash mismatch for stored object '{filename}'."
            )

        file_path = os.path.join(storage_engine.local_base_dir, saved_key)

        # 4. Run Quality & EXIF Engines based on file type
        media_type = "VIDEO" if ext == "mp4" else "IMAGE"
        issues = []

        if existing_duplicate:
            issues.append(f"DUPLICATE_FILE: SHA-256 hash matches existing file '{existing_duplicate.filename}'")

        if media_type == "IMAGE":
            quality_result = quality_engine.analyze_image(content)
            exif_result = exif_engine.extract_metadata(content)
        else:
            quality_result = quality_engine.analyze_video(content, filename)
            exif_result = {
                "gps_status": "UNAVAILABLE",
                "latitude": None,
                "longitude": None,
                "altitude": None,
                "camera_make": None,
                "camera_model": None,
                "capture_time": None
            }

        # Combine Quality Issues
        if quality_result.get("quality_issues"):
            issues.extend(quality_result["quality_issues"])

        quality_status = quality_result.get("quality_status", "VALID")
        if existing_duplicate and quality_status == "VALID":
            quality_status = "WARNING"

        if quality_status == "VALID":
            valid_count += 1
        elif quality_status == "WARNING":
            warning_count += 1
        else:
            rejected_count += 1

        img_obj = DroneImage(
            dataset_id=dataset.id,
            filename=filename,
            file_path=file_path,
            storage_key=saved_key,
            storage_provider=storage_engine.provider,
            mime_type=mime_type,
            media_type=media_type,
            file_size_bytes=file_size,
            file_hash_sha256=sha256_hash,
            resolution_w=quality_result.get("resolution_w"),
            resolution_h=quality_result.get("resolution_h"),
            width=quality_result.get("resolution_w"),
            height=quality_result.get("resolution_h"),
            blur_score=quality_result.get("blur_score", 0.0),
            brightness_score=quality_result.get("brightness_score", 0.0),
            duration_seconds=quality_result.get("duration_seconds", 0.0),
            fps=quality_result.get("fps", 0.0),
            frame_count=quality_result.get("frame_count", 0),
            gps_status=exif_result.get("gps_status", "UNAVAILABLE"),
            latitude=exif_result.get("latitude"),
            longitude=exif_result.get("longitude"),
            altitude=exif_result.get("altitude"),
            camera_make=exif_result.get("camera_make"),
            camera_model=exif_result.get("camera_model"),
            capture_time=exif_result.get("capture_time"),
            quality_status=quality_status,
            quality_issues=json.dumps(issues) if issues else None
        )
        db.add(img_obj)

    dataset.total_files = total_count
    dataset.valid_files = valid_count
    dataset.warning_files = warning_count
    dataset.rejected_files = rejected_count
    dataset.upload_status = "COMPLETED" if (valid_count + warning_count) > 0 else "FAILED"

    # Lifecycle transition: Update inspection status to DATA_UPLOADED if at least 1 valid/warning file
    if (valid_count + warning_count) > 0:
        insp.status = InspectionStatus.DATA_UPLOADED
        insp.coverage_percentage = min(100.0, max(20.0, total_count * 15.0))

    db.commit()
    db.refresh(dataset)

    # Audit log entry
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPLOAD_DRONE_DATA",
        entity_type="DroneDataset",
        entity_id=str(dataset.id),
        new_value=f"Uploaded {total_count} files (Valid: {valid_count}, Warning: {warning_count}, Rejected: {rejected_count}) for Inspection {insp.inspection_code}"
    )
    db.add(audit)
    db.commit()

    return dataset


@router.get("/inspections/{inspection_id}/datasets", response_model=List[DroneDatasetOut])
@router.get("/inspection/{inspection_id}/datasets", response_model=List[DroneDatasetOut])
def get_inspection_datasets(inspection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection {inspection_id} not found.")

    datasets = db.query(DroneDataset).filter(DroneDataset.inspection_id == inspection_id).order_by(DroneDataset.uploaded_at.desc()).all()
    return datasets


@router.get("/dataset/{dataset_id}", response_model=DroneDatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = db.query(DroneDataset).filter(DroneDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
    return dataset


@router.get("/inspections/{inspection_id}/media", response_model=List[DroneImageOut])
@router.get("/inspection/{inspection_id}/media", response_model=List[DroneImageOut])
def list_inspection_media(inspection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection {inspection_id} not found.")

    images = (
        db.query(DroneImage)
        .join(DroneDataset)
        .filter(DroneDataset.inspection_id == inspection_id)
        .order_by(DroneImage.id.desc())
        .all()
    )
    return images


@router.get("/media/{media_id}", response_model=DroneImageOut)
def get_media_detail(media_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    img = db.query(DroneImage).filter(DroneImage.id == media_id).first()
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media record not found.")
    return img


@router.get("/media/{media_id}/file")
@router.get("/media/{media_id}/view")
def get_media_file_by_id(media_id: int, db: Session = Depends(get_db)):
    img = db.query(DroneImage).filter(DroneImage.id == media_id).first()
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media record not found.")
    storage_key = img.storage_key or f"media/original/DAM/INSP/{img.filename}"
    file_bytes = storage_engine.download(storage_key)
    ext = img.filename.split(".")[-1].lower() if "." in img.filename else ""
    mime_type = "video/mp4" if ext == "mp4" else f"image/{'png' if ext == 'png' else 'jpeg'}"
    return Response(content=file_bytes, media_type=mime_type)


@router.get("/file/{storage_key:path}")
@router.get("/storage/{storage_key:path}")
def get_media_file(storage_key: str):
    file_bytes = storage_engine.download(storage_key)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found in storage.")
    ext = storage_key.split(".")[-1].lower() if "." in storage_key else ""
    mime_type = "video/mp4" if ext == "mp4" else f"image/{'png' if ext == 'png' else 'jpeg'}"
    return Response(content=file_bytes, media_type=mime_type)


@router.patch("/media/{media_id}/georeference", response_model=DroneImageOut)
def georeference_media(
    media_id: int,
    req: GeoreferenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.INSPECTION_ENGINEER]))
):
    if not (-90.0 <= req.latitude <= 90.0 and -180.0 <= req.longitude <= 180.0):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid latitude (-90 to 90) or longitude (-180 to 180) range.")

    img = db.query(DroneImage).filter(DroneImage.id == media_id).first()
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media record not found.")

    old_lat = img.latitude
    old_lng = img.longitude
    old_status = img.gps_status

    img.latitude = req.latitude
    img.longitude = req.longitude
    if req.altitude is not None:
        img.altitude = req.altitude
    img.gps_status = "MANUALLY_GEOREFERENCED"
    img.georeference_method = "MANUAL"
    img.georeferenced_by_id = current_user.id
    img.georeferenced_at = datetime.utcnow()
    img.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(img)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="MANUAL_GEOREFERENCE_MEDIA",
        entity_type="DroneImage",
        entity_id=str(img.id),
        old_value=f"lat: {old_lat}, lng: {old_lng}, status: {old_status}",
        new_value=f"lat: {req.latitude}, lng: {req.longitude}, status: MANUALLY_GEOREFERENCED"
    )
    db.add(audit)
    db.commit()

    return img


@router.delete("/media/{media_id}", status_code=status.HTTP_200_OK)
def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.INSPECTION_ENGINEER]))
):
    img = db.query(DroneImage).filter(DroneImage.id == media_id).first()
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media record not found.")

    if img.storage_key:
        storage_engine.delete(img.storage_key)

    db.delete(img)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DELETE_MEDIA",
        entity_type="DroneImage",
        entity_id=str(media_id),
        new_value=f"Deleted media record {img.filename}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Media record {media_id} successfully deleted."}

