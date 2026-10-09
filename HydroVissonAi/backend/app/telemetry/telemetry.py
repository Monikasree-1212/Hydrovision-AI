from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import math, random

from app.database.base import get_db
from app.database.models import Dam, User
from app.auth.auth import get_current_user

router = APIRouter(prefix="/telemetry", tags=["IoT Telemetry & Sensors"])

@router.get("/dams/{dam_id}/live")
def get_dam_live_telemetry(
    dam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    # Calculate realistic hydro sensor readings based on dam parameters
    frl = dam.height_meters * 0.92  # Full Reservoir Level
    mwl = dam.height_meters * 0.98  # Maximum Water Level
    current_wl = round(frl * (0.85 + random.uniform(-0.02, 0.03)), 2)

    inflow_m3s = round(random.uniform(450.0, 1250.0), 1)
    outflow_m3s = round(inflow_m3s * random.uniform(0.85, 0.98), 1)
    seepage_lmin = round(random.uniform(12.4, 18.9), 2)
    piezometer_kpa = round(random.uniform(140.0, 185.0), 1)
    seismic_g = round(random.uniform(0.001, 0.008), 4)

    # Determine alert status
    status = "NORMAL"
    alerts = []
    if current_wl > frl:
        status = "WARNING"
        alerts.append("Reservoir level approaching Maximum Water Level (MWL).")
    if seepage_lmin > 25.0:
        status = "CRITICAL"
        alerts.append("Foundation seepage rate exceeded 25 L/min safety threshold.")

    return {
        "dam_id": dam.id,
        "dam_name": dam.name,
        "timestamp": datetime.utcnow().isoformat(),
        "frl_meters": round(frl, 2),
        "mwl_meters": round(mwl, 2),
        "current_water_level_meters": current_wl,
        "water_level_percentage": round((current_wl / frl) * 100, 1),
        "inflow_m3s": inflow_m3s,
        "outflow_m3s": outflow_m3s,
        "seepage_rate_lmin": seepage_lmin,
        "piezometric_pressure_kpa": piezometer_kpa,
        "seismic_acceleration_g": seismic_g,
        "overall_sensor_status": status,
        "active_sensor_alerts": alerts
    }

@router.get("/dams/{dam_id}/history")
def get_dam_telemetry_history(
    dam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    frl = dam.height_meters * 0.92
    history = []
    now = datetime.utcnow()

    for i in range(24, 0, -1):
        ts = now - timedelta(hours=i)
        val = round(frl * (0.83 + (math.sin(i / 3.0) * 0.04)), 2)
        inflow = round(600 + math.sin(i / 4.0) * 350 + random.uniform(-20, 20), 1)
        seepage = round(14.5 + (math.sin(i / 6.0) * 2.2), 2)

        history.append({
            "timestamp": ts.strftime("%H:00"),
            "water_level": val,
            "inflow": inflow,
            "seepage": seepage
        })

    return {"dam_id": dam.id, "dam_name": dam.name, "history": history}
