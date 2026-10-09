import os
from typing import Dict, Any, List, Optional
from app.config import settings

class ModelManager:
    """
    YOLO11 Model Life Cycle Manager for HydroVision AI.
    Loads and manages real trained model weights if configured.
    Exposes real status (CONFIGURED, LOADED, UNAVAILABLE, LOAD_FAILED) without fake metrics.
    """

    SUPPORTED_CLASSES = ["CRACK", "CORROSION", "SEEPAGE", "SPALLING", "EROSION", "VEGETATION"]

    def __init__(self):
        self.model_path = getattr(settings, "YOLO_MODEL_PATH", "./models/yolo11_dam_defects.pt")
        self.confidence_threshold = getattr(settings, "YOLO_CONFIDENCE_THRESHOLD", 0.25)
        self.iou_threshold = getattr(settings, "YOLO_IOU_THRESHOLD", 0.45)
        self.device = getattr(settings, "YOLO_DEVICE", "cpu")
        
        self.status = "UNAVAILABLE"
        self.model_name = None
        self.model_version = "UNKNOWN"
        self.last_error = None
        self.yolo_model = None

        self._initialize_model()

    def _initialize_model(self):
        # Resolve target model path or fallback paths
        target_path = self.model_path
        if not os.path.exists(target_path):
            fallback_1 = os.path.join(os.path.dirname(__file__), "..", "..", "models", "yolo11", "yolo11n.pt")
            fallback_2 = os.path.join(os.path.dirname(__file__), "..", "..", "models", "yolo11_dam_defects.pt")
            if os.path.exists(fallback_1):
                target_path = fallback_1
            elif os.path.exists(fallback_2):
                target_path = fallback_2

        if not os.path.exists(target_path):
            self.status = "UNAVAILABLE"
            self.last_error = f"YOLO11 model weight file not found at path: {self.model_path}. Live defect inference is unavailable."
            return

        self.status = "CONFIGURED"

        # Attempt to load model via Ultralytics
        try:
            from ultralytics import YOLO
            self.yolo_model = YOLO(target_path)
            self.model_name = os.path.basename(target_path)
            self.model_path = target_path
            self.status = "LOADED"
            self.model_version = "1.0.0"
            self.last_error = None
        except ImportError:
            self.status = "LOAD_FAILED"
            self.last_error = "Ultralytics package is not installed in the environment."
        except Exception as e:
            self.status = "LOAD_FAILED"
            self.last_error = f"Failed to load YOLO11 model weights: {str(e)}"

    def reload_model(self):
        self._initialize_model()

    def is_available(self) -> bool:
        return self.status == "LOADED" and self.yolo_model is not None

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "model_name": self.model_name,
            "model_version": self.model_version if self.is_available() else "UNKNOWN",
            "supported_classes": self.SUPPORTED_CLASSES,
            "device": self.device,
            "confidence_threshold": self.confidence_threshold,
            "iou_threshold": self.iou_threshold,
            "model_path": self.model_path,
            "reason": self.last_error if not self.is_available() else None
        }

model_manager = ModelManager()
