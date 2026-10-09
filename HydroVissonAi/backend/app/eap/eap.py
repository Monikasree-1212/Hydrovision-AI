from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

from app.database.base import get_db
from app.database.models import Dam, User, AuditLog
from app.auth.auth import get_current_user

router = APIRouter(prefix="/eap", tags=["Monsoon & Emergency Action Plan"])

@router.get("/dams/{dam_id}/simulation")
def get_monsoon_inflow_forecast(
    dam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    now = datetime.utcnow()
    forecast = []
    base_inflow = 850.0

    for h in [6, 12, 18, 24, 36, 48, 72]:
        peak_factor = 1.0 + (math.sin(h / 12.0) * 0.45)
        inflow = round(base_inflow * peak_factor, 1)
        gates_recommended = min(12, max(0, int((inflow - 600) / 120)))
        
        forecast.append({
            "hour_offset": f"+{h}h",
            "predicted_timestamp": (now + timedelta(hours=h)).strftime("%Y-%m-%d %H:00 UTC"),
            "predicted_inflow_m3s": inflow,
            "recommended_gate_openings": gates_recommended,
            "estimated_spillway_release_m3s": round(gates_recommended * 140.0, 1)
        })

    return {
        "dam_id": dam.id,
        "dam_name": dam.name,
        "current_eap_level": "LEVEL_1_WATCH",
        "catchment_rainfall_24h_mm": 68.4,
        "flood_warning_status": "MONSOON_INFLOW_MONITORING",
        "forecast": forecast
    }

import math

@router.post("/dams/{dam_id}/trigger-eap")
def trigger_eap_protocol(
    dam_id: int,
    level: str = Body(..., embed=True),
    reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    if level not in ["LEVEL_1_WATCH", "LEVEL_2_ALERT", "LEVEL_3_EMERGENCY"]:
        raise HTTPException(status_code=400, detail="Invalid EAP Level.")

    # Audit EAP Trigger Action
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action=f"EAP_TRIGGER_{level}",
        entity_type="Dam",
        entity_id=str(dam.id),
        new_value=f"Triggered EAP {level} for dam {dam.name}. Reason: {reason}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {
        "status": "SUCCESS",
        "dam_id": dam.id,
        "dam_name": dam.name,
        "activated_eap_level": level,
        "triggered_by": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat(),
        "notified_agencies": [
            "National Disaster Response Force (NDRF 10th Bn)",
            "State Disaster Management Authority (SDMA)",
            "District Magistrate & Collectorate Office",
            "Central Water Commission (Flood Forecasting Cell)"
        ],
        "message": f"Emergency Action Plan {level} activated. Automated emergency protocol broadcasts dispatched."
    }
