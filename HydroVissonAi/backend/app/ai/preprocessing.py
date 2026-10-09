import numpy as np
import cv2
from typing import Optional, Tuple

class ImagePreprocessor:
    """
    Image Preprocessing Service for HydroVision AI Defect Detection.
    Decodes raw file bytes, validates dimensions, and converts color formats for YOLO inference while preserving source files.
    """

    @staticmethod
    def decode_and_format(file_bytes: bytes) -> Tuple[Optional[np.ndarray], int, int]:
        """
        Decodes file bytes into an OpenCV BGR numpy array and returns (img_bgr, width, height).
        """
        if not file_bytes:
            return None, 0, 0

        np_arr = np.frombuffer(file_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return None, 0, 0

        height, width = img_bgr.shape[:2]
        return img_bgr, width, height

    @staticmethod
    def prepare_for_inference(img_bgr: np.ndarray) -> np.ndarray:
        """
        Converts BGR image array to RGB format required by PyTorch / YOLO inference models.
        """
        return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

preprocessor = ImagePreprocessor()
