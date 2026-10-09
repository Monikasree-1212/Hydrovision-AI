import os
import io
import hashlib
import tempfile
import numpy as np
import cv2
from typing import Dict, Any, List
from app.config import settings

class QualityEngine:
    """
    OpenCV Image and Video Quality Analysis Engine for HydroVision AI.
    Calculates SHA-256 content hash, Laplacian blur variance, luminance, resolution, and MP4 video metrics.
    """

    BLUR_THRESHOLD = float(os.getenv("BLUR_THRESHOLD", "80.0"))
    DARK_THRESHOLD = float(os.getenv("DARK_THRESHOLD", "35.0"))
    OVEREXPOSURE_THRESHOLD = float(os.getenv("OVEREXPOSURE_THRESHOLD", "225.0"))

    @staticmethod
    def calculate_sha256(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @classmethod
    def analyze_image(cls, file_bytes: bytes) -> Dict[str, Any]:
        issues: List[str] = []
        status = "VALID"

        # Decode image using OpenCV
        np_arr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return {
                "quality_status": "REJECTED",
                "quality_issues": ["Corrupted image or unsupported file format"],
                "resolution_w": 0,
                "resolution_h": 0,
                "blur_score": 0.0,
                "brightness_score": 0.0
            }

        height, width = img.shape[:2]

        # Resolution check (< 1920x1080)
        if width < 1920 or height < 1080:
            issues.append(f"Low resolution ({width}x{height} below recommended 1920x1080)")
            status = "WARNING"

        # Convert to Grayscale for Blur & Luminance Analysis
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Laplacian Blur Score
        blur_score = round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 1)
        if blur_score < cls.BLUR_THRESHOLD:
            issues.append(f"Blur detected (Score: {blur_score} < Threshold: {cls.BLUR_THRESHOLD})")
            status = "WARNING"

        # 2. Brightness / Luminance Score
        brightness_score = round(float(gray.mean()), 1)
        if brightness_score < cls.DARK_THRESHOLD:
            issues.append(f"Low lighting / dark image (Score: {brightness_score} < {cls.DARK_THRESHOLD})")
            status = "WARNING"
        elif brightness_score > cls.OVEREXPOSURE_THRESHOLD:
            issues.append(f"Overexposed image (Score: {brightness_score} > {cls.OVEREXPOSURE_THRESHOLD})")
            status = "WARNING"

        return {
            "quality_status": status,
            "quality_issues": issues,
            "resolution_w": width,
            "resolution_h": height,
            "blur_score": blur_score,
            "brightness_score": brightness_score
        }

    @classmethod
    def analyze_video(cls, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        issues: List[str] = ["VIDEO_CONTAINER_PROCESSED"]
        status = "VALID"

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                os.remove(tmp_path)
                return {
                    "quality_status": "REJECTED",
                    "quality_issues": ["Corrupted or invalid MP4 video container"],
                    "resolution_w": 0,
                    "resolution_h": 0,
                    "duration_seconds": 0.0,
                    "fps": 0.0,
                    "frame_count": 0,
                    "blur_score": 0.0,
                    "brightness_score": 0.0
                }

            fps = round(float(cap.get(cv2.CAP_PROP_FPS)), 1)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = round(frame_count / fps, 1) if fps > 0 else 0.0

            # Extract middle representative frame for keyframe quality check
            cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, frame_count // 2))
            ret, frame = cap.read()
            cap.release()

            blur_score = 0.0
            brightness_score = 0.0

            if ret and frame is not None:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                blur_score = round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 1)
                brightness_score = round(float(gray.mean()), 1)

                if blur_score < cls.BLUR_THRESHOLD:
                    issues.append(f"VIDEO_FRAME_QUALITY: Frame blur detected ({blur_score})")
                    status = "WARNING"
                if brightness_score < cls.DARK_THRESHOLD or brightness_score > cls.OVEREXPOSURE_THRESHOLD:
                    issues.append(f"VIDEO_FRAME_QUALITY: Frame lighting issue ({brightness_score})")
                    status = "WARNING"

            if width < 1920 or height < 1080:
                issues.append(f"Low video resolution ({width}x{height})")
                if status == "VALID":
                    status = "WARNING"

            os.remove(tmp_path)

            return {
                "quality_status": status,
                "quality_issues": issues,
                "resolution_w": width,
                "resolution_h": height,
                "duration_seconds": duration,
                "fps": fps,
                "frame_count": frame_count,
                "blur_score": blur_score,
                "brightness_score": brightness_score
            }
        except Exception as e:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return {
                "quality_status": "REJECTED",
                "quality_issues": [f"Video processing failed: {str(e)}"],
                "resolution_w": 0,
                "resolution_h": 0,
                "duration_seconds": 0.0,
                "fps": 0.0,
                "frame_count": 0,
                "blur_score": 0.0,
                "brightness_score": 0.0
            }

quality_engine = QualityEngine()
