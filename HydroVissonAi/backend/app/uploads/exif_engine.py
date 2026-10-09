import io
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from PIL import Image, ExifTags

class EXIFEngine:
    """
    EXIF Metadata and GPS Coordinate Extraction Engine for HydroVision AI.
    Converts EXIF Degrees/Minutes/Seconds to Decimal Degrees cleanly.
    """

    @staticmethod
    def _dms_to_decimal(dms: Tuple[float, float, float], ref: str) -> Optional[float]:
        try:
            deg = float(dms[0])
            minute = float(dms[1])
            sec = float(dms[2])
            decimal = deg + (minute / 60.0) + (sec / 3600.0)
            if ref in ['S', 'W']:
                decimal = -decimal
            return round(decimal, 6)
        except Exception:
            return None

    @classmethod
    def extract_metadata(cls, image_bytes: bytes) -> Dict[str, Any]:
        result = {
            "gps_status": "UNAVAILABLE",
            "latitude": None,
            "longitude": None,
            "altitude": None,
            "camera_make": None,
            "camera_model": None,
            "capture_time": None
        }

        try:
            img = Image.open(io.BytesIO(image_bytes))
            exif_data = img._getexif()
            if not exif_data:
                return result

            # Map tag names
            tagged_exif = {}
            for tag_id, val in exif_data.items():
                tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                tagged_exif[tag_name] = val

            # Camera Make / Model
            result["camera_make"] = str(tagged_exif.get("Make", "")).strip() or None
            result["camera_model"] = str(tagged_exif.get("Model", "")).strip() or None

            # Capture Date
            date_str = tagged_exif.get("DateTimeOriginal") or tagged_exif.get("DateTime")
            if date_str and isinstance(date_str, str):
                try:
                    result["capture_time"] = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
                except Exception:
                    pass

            # GPS Info Tag (34853)
            gps_info = tagged_exif.get("GPSInfo")
            if gps_info and isinstance(gps_info, dict):
                gps_tags = {}
                for g_tag_id, g_val in gps_info.items():
                    g_tag_name = ExifTags.GPSTAGS.get(g_tag_id, g_tag_id)
                    gps_tags[g_tag_name] = g_val

                lat_dms = gps_tags.get("GPSLatitude")
                lat_ref = gps_tags.get("GPSLatitudeRef", "N")
                lng_dms = gps_tags.get("GPSLongitude")
                lng_ref = gps_tags.get("GPSLongitudeRef", "E")

                if lat_dms and lng_dms:
                    lat_dec = cls._dms_to_decimal(lat_dms, lat_ref)
                    lng_dec = cls._dms_to_decimal(lng_dms, lng_ref)

                    if lat_dec is not None and lng_dec is not None:
                        # Validate coordinate bounds
                        if -90.0 <= lat_dec <= 90.0 and -180.0 <= lng_dec <= 180.0:
                            result["latitude"] = lat_dec
                            result["longitude"] = lng_dec
                            result["gps_status"] = "EXIF_EXTRACTED"
                        else:
                            result["gps_status"] = "INVALID"

                alt_val = gps_tags.get("GPSAltitude")
                if alt_val:
                    try:
                        result["altitude"] = round(float(alt_val), 1)
                    except Exception:
                        pass

        except Exception as e:
            pass

        return result

exif_engine = EXIFEngine()
