import os
import cv2
import numpy as np
from typing import List, Dict, Any
from app.uploads.storage_engine import storage_engine

class AnnotationService:
    """
    Derivative Image Annotation Engine for HydroVision AI.
    Renders bounding boxes, defect labels, confidence percentages, and detection IDs onto a copy of the image.
    Saves derivative annotated images using StorageEngine without mutating original media.
    """

    COLOR_MAP = {
        "CRACK": (0, 0, 255),       # Red (BGR)
        "CORROSION": (0, 165, 255),  # Orange (BGR)
        "SEEPAGE": (255, 0, 0),      # Blue (BGR)
        "SPALLING": (0, 215, 255),   # Yellow/Gold (BGR)
        "EROSION": (255, 0, 255),    # Magenta (BGR)
        "VEGETATION": (0, 255, 0),   # Green (BGR)
    }
    DEFAULT_COLOR = (0, 255, 0)     # Green fallback

    @classmethod
    def render_and_store_annotations(
        cls,
        img_bgr: np.ndarray,
        detections: List[Dict[str, Any]],
        dam_code: str,
        inspection_code: str,
        job_code: str,
        filename: str
    ) -> str:
        """
        Renders bounding boxes and labels onto a copy of img_bgr, encodes to JPEG, uploads via storage_engine,
        and returns the storage_key for the derivative annotated image.
        """
        # Create a deep copy of the image to ensure original is preserved
        annotated_img = img_bgr.copy()

        for det in detections:
            bbox_x_min = int(det["bbox_x_min"])
            bbox_y_min = int(det["bbox_y_min"])
            bbox_x_max = int(det["bbox_x_max"])
            bbox_y_max = int(det["bbox_y_max"])
            
            defect_type = str(det.get("defect_type", "UNKNOWN")).upper()
            confidence = float(det.get("confidence", 0.0))
            det_code = str(det.get("detection_code", "DET-000"))

            color = cls.COLOR_MAP.get(defect_type, cls.DEFAULT_COLOR)

            # Draw bounding box rectangle
            cv2.rectangle(annotated_img, (bbox_x_min, bbox_y_min), (bbox_x_max, bbox_y_max), color, 3)

            # Format label text: "DET-001 | CRACK 87%"
            label = f"{det_code} | {defect_type} {int(confidence * 100)}%"

            # Calculate label background banner dimensions
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.6
            thickness = 2
            (label_w, label_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)

            # Label box background
            banner_y1 = max(0, bbox_y_min - label_h - 10)
            banner_y2 = bbox_y_min
            cv2.rectangle(
                annotated_img,
                (bbox_x_min, banner_y1),
                (bbox_x_min + label_w + 10, banner_y2),
                color,
                -1
            )

            # Label text overlay (white text)
            cv2.putText(
                annotated_img,
                label,
                (bbox_x_min + 5, banner_y2 - 5),
                font,
                font_scale,
                (255, 255, 255),
                thickness,
                cv2.LINE_AA
            )

        # Encode annotated image to JPEG buffer
        success, encoded_buf = cv2.imencode(".jpg", annotated_img)
        if not success:
            return ""

        annotated_bytes = encoded_buf.tobytes()

        # Generate storage key for processed derivative image
        safe_dam = storage_engine.sanitize_filename(dam_code)
        safe_insp = storage_engine.sanitize_filename(inspection_code)
        safe_job = storage_engine.sanitize_filename(job_code)
        safe_file = storage_engine.sanitize_filename(filename)
        
        storage_key = f"processed/{safe_dam}/{safe_insp}/{safe_job}_{safe_file}"
        saved_key = storage_engine.upload(annotated_bytes, storage_key, mime_type="image/jpeg")

        return saved_key

annotation_service = AnnotationService()
