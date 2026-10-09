import math
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from app.database.models import Defect, Inspection, DefectComparison, DefectSeverity, DefectStatus

# Configuration default
DEFAULT_MATCH_DISTANCE_METERS = 10.0

SEVERITY_RANK = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4
}

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two GPS coordinates in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_match_confidence(
    distance_meters: float,
    max_distance_meters: float,
    type1: str,
    type2: str,
    precision1: Optional[str],
    precision2: Optional[str]
) -> float:
    """
    Calculates explainable Historical Match Confidence score (0.0 to 1.0).
    Exposes key components: spatial proximity, defect type agreement, location precision.
    """
    # 1. Proximity score (max 50 points)
    dist_ratio = min(1.0, max(0.0, distance_meters / max_distance_meters))
    proximity_score = 50.0 * (1.0 - dist_ratio)

    # 2. Type agreement (30 points)
    type_score = 30.0 if (type1 or "").upper() == (type2 or "").upper() else 0.0

    # 3. Location precision quality (max 20 points)
    p1 = (precision1 or "UNAVAILABLE").upper()
    p2 = (precision2 or "UNAVAILABLE").upper()
    
    if p1 == "PRECISE_SURVEY" and p2 == "PRECISE_SURVEY":
        precision_score = 20.0
    elif p1 in ("PRECISE_SURVEY", "MANUAL_GEOREFERENCE") and p2 in ("PRECISE_SURVEY", "MANUAL_GEOREFERENCE"):
        precision_score = 15.0
    elif p1 == "MEDIA_REFERENCE" or p2 == "MEDIA_REFERENCE":
        precision_score = 10.0
    else:
        precision_score = 5.0

    total_score = proximity_score + type_score + precision_score
    return round(min(1.0, max(0.0, total_score / 100.0)), 2)

def is_valid_location(defect: Defect) -> bool:
    """
    Checks if a defect has valid spatial coordinates and non-UNAVAILABLE precision.
    """
    if defect.latitude is None or defect.longitude is None:
        return False
    if (defect.location_precision or "UNAVAILABLE").upper() == "UNAVAILABLE":
        return False
    if (defect.coordinate_source or "UNAVAILABLE").upper() == "UNAVAILABLE":
        return False
    return True

def classify_deterioration_status(
    comparison_status: str,
    severity_change: Optional[str],
    measurement_change_pct: Optional[float],
    current_severity: Optional[str]
) -> str:
    """
    Deterministic calculation for Decision-Support Deterioration Status.
    Returns: STABLE, MONITORING, DETERIORATING, SIGNIFICANTLY_DETERIORATING
    """
    curr_sev = (current_severity or "MEDIUM").upper()
    
    if comparison_status == "INCREASING":
        if (measurement_change_pct is not None and measurement_change_pct >= 25.0) or curr_sev == "CRITICAL":
            return "SIGNIFICANTLY_DETERIORATING"
        return "DETERIORATING"
    
    if comparison_status in ("NEW", "RECURRING"):
        if curr_sev in ("HIGH", "CRITICAL"):
            return "DETERIORATING"
        return "MONITORING"

    if comparison_status == "UNCHANGED":
        if curr_sev in ("HIGH", "CRITICAL"):
            return "MONITORING"
        return "STABLE"

    if comparison_status in ("DECREASING", "RESOLVED", "NOT_OBSERVED"):
        return "STABLE"

    return "MONITORING"

def compare_inspections_logic(
    current_inspection: Inspection,
    historical_inspection: Inspection,
    current_defects: List[Defect],
    historical_defects: List[Defect],
    match_distance_meters: float = DEFAULT_MATCH_DISTANCE_METERS
) -> Dict[str, Any]:
    """
    Executes real database-driven spatial and defect matching between current & historical inspections.
    """
    matched_pairs: List[Tuple[Defect, Defect, float, float]] = [] # (curr, hist, distance, confidence)
    matched_curr_ids = set()
    matched_hist_ids = set()

    # 1. Spatial + Defect Type Matching
    for curr in current_defects:
        if not is_valid_location(curr):
            continue  # Location unavailable -> DO NOT match spatially

        best_hist: Optional[Defect] = None
        best_dist: float = float("inf")

        for hist in historical_defects:
            if hist.id in matched_hist_ids:
                continue
            if not is_valid_location(hist):
                continue

            # Must have same/compatible defect type
            if (curr.defect_type or "").upper() != (hist.defect_type or "").upper():
                continue

            dist = calculate_haversine_distance(curr.latitude, curr.longitude, hist.latitude, hist.longitude)
            if dist <= match_distance_meters and dist < best_dist:
                best_dist = dist
                best_hist = hist

        if best_hist is not None:
            conf = calculate_match_confidence(
                best_dist, match_distance_meters,
                curr.defect_type, best_hist.defect_type,
                curr.location_precision, best_hist.location_precision
            )
            matched_pairs.append((curr, best_hist, best_dist, conf))
            matched_curr_ids.add(curr.id)
            matched_hist_ids.add(best_hist.id)

    # 2. Build DefectComparison records
    comparisons: List[Dict[str, Any]] = []
    
    # Process matched pairs
    for curr, hist, dist, conf in matched_pairs:
        # Determine measurement change
        curr_meas = curr.estimated_length_mm or curr.estimated_area_sq_cm or curr.estimated_width_mm
        hist_meas = hist.estimated_length_mm or hist.estimated_area_sq_cm or hist.estimated_width_mm
        
        meas_diff_mm: Optional[float] = None
        meas_pct: Optional[float] = None

        if curr_meas is not None and hist_meas is not None:
            meas_diff_mm = round(curr_meas - hist_meas, 2)
            if hist_meas > 0:
                meas_pct = round((meas_diff_mm / hist_meas) * 100.0, 1)

        curr_sev_str = curr.severity.value if hasattr(curr.severity, "value") else str(curr.severity)
        hist_sev_str = hist.severity.value if hasattr(hist.severity, "value") else str(hist.severity)
        
        curr_sev_rank = SEVERITY_RANK.get(curr_sev_str.upper(), 2)
        hist_sev_rank = SEVERITY_RANK.get(hist_sev_str.upper(), 2)

        sev_change = f"{hist_sev_str} -> {curr_sev_str}" if curr_sev_str != hist_sev_str else "UNCHANGED"

        # Check for RECURRING
        is_recurring = False
        if hist.status in (DefectStatus.RESOLVED, "RESOLVED"):
            is_recurring = True

        if is_recurring:
            status = "RECURRING"
        elif curr_sev_rank > hist_sev_rank or (meas_pct is not None and meas_pct > 5.0) or (meas_diff_mm is not None and meas_diff_mm > 1.0):
            status = "INCREASING"
        elif curr_sev_rank < hist_sev_rank or (meas_pct is not None and meas_pct < -5.0) or (meas_diff_mm is not None and meas_diff_mm < -1.0):
            status = "DECREASING"
        else:
            status = "UNCHANGED"

        det_status = classify_deterioration_status(status, sev_change, meas_pct, curr_sev_str)

        comparisons.append({
            "dam_id": current_inspection.dam_id,
            "current_inspection_id": current_inspection.id,
            "historical_inspection_id": historical_inspection.id,
            "current_defect_id": curr.id,
            "historical_defect_id": hist.id,
            "match_method": "SPATIAL_AND_TYPE",
            "match_distance_meters": round(dist, 2),
            "match_confidence": conf,
            "comparison_status": status,
            "measurement_change_mm": meas_diff_mm,
            "measurement_change_pct": meas_pct,
            "severity_change": sev_change,
            "deterioration_status": det_status,
            "current_defect": curr,
            "historical_defect": hist
        })

    # Process Unmatched Current Defects -> NEW
    for curr in current_defects:
        if curr.id in matched_curr_ids:
            continue
        
        curr_sev_str = curr.severity.value if hasattr(curr.severity, "value") else str(curr.severity)
        det_status = classify_deterioration_status("NEW", None, None, curr_sev_str)

        comparisons.append({
            "dam_id": current_inspection.dam_id,
            "current_inspection_id": current_inspection.id,
            "historical_inspection_id": historical_inspection.id,
            "current_defect_id": curr.id,
            "historical_defect_id": None,
            "match_method": "UNMATCHED",
            "match_distance_meters": None,
            "match_confidence": None,
            "comparison_status": "NEW",
            "measurement_change_mm": None,
            "measurement_change_pct": None,
            "severity_change": None,
            "deterioration_status": det_status,
            "current_defect": curr,
            "historical_defect": None
        })

    # Process Unmatched Historical Defects -> RESOLVED or NOT OBSERVED
    # Check current inspection coverage percentage
    coverage = current_inspection.coverage_percentage or 0.0
    confirmed_coverage = coverage >= 80.0

    for hist in historical_defects:
        if hist.id in matched_hist_ids:
            continue
        
        status = "RESOLVED" if confirmed_coverage else "NOT_OBSERVED"
        hist_sev_str = hist.severity.value if hasattr(hist.severity, "value") else str(hist.severity)
        det_status = classify_deterioration_status(status, None, None, hist_sev_str)

        comparisons.append({
            "dam_id": current_inspection.dam_id,
            "current_inspection_id": current_inspection.id,
            "historical_inspection_id": historical_inspection.id,
            "current_defect_id": None,
            "historical_defect_id": hist.id,
            "match_method": "UNMATCHED",
            "match_distance_meters": None,
            "match_confidence": None,
            "comparison_status": status,
            "measurement_change_mm": None,
            "measurement_change_pct": None,
            "severity_change": None,
            "deterioration_status": det_status,
            "current_defect": None,
            "historical_defect": hist
        })

    return {
        "current_inspection_id": current_inspection.id,
        "historical_inspection_id": historical_inspection.id,
        "match_distance_meters": match_distance_meters,
        "total_current_defects": len(current_defects),
        "total_historical_defects": len(historical_defects),
        "matched_count": len(matched_pairs),
        "new_count": sum(1 for c in comparisons if c["comparison_status"] == "NEW"),
        "unchanged_count": sum(1 for c in comparisons if c["comparison_status"] == "UNCHANGED"),
        "increasing_count": sum(1 for c in comparisons if c["comparison_status"] == "INCREASING"),
        "decreasing_count": sum(1 for c in comparisons if c["comparison_status"] == "DECREASING"),
        "resolved_count": sum(1 for c in comparisons if c["comparison_status"] == "RESOLVED"),
        "not_observed_count": sum(1 for c in comparisons if c["comparison_status"] == "NOT_OBSERVED"),
        "recurring_count": sum(1 for c in comparisons if c["comparison_status"] == "RECURRING"),
        "comparisons": comparisons
    }
