from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.base import get_db
from app.database.models import Dam, DamZone, User, UserRole, AuditLog
from app.schemas.schemas import DamCreate, DamOut, DamZoneCreate, DamZoneOut
from app.auth.auth import get_current_user, require_roles

router = APIRouter(prefix="/dams", tags=["Dams Management"])

@router.get("", response_model=List[DamOut])
def get_dams(
    search: Optional[str] = Query(None, description="Search by dam name or state"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Dam)
    if search:
        query = query.filter((Dam.name.ilike(f"%{search}%")) | (Dam.state.ilike(f"%{search}%")))
    dams = query.order_by(Dam.name).all()
    return dams

@router.post("", response_model=DamOut, status_code=status.HTTP_201_CREATED)
def create_dam(
    dam_in: DamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.AUTHORITY]))
):
    existing = db.query(Dam).filter(Dam.code == dam_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Dam with code '{dam_in.code}' already exists.")

    new_dam = Dam(
        name=dam_in.name,
        code=dam_in.code,
        state=dam_in.state,
        district=dam_in.district,
        dam_type=dam_in.dam_type,
        height_meters=dam_in.height_meters,
        length_meters=dam_in.length_meters,
        storage_capacity_mcm=dam_in.storage_capacity_mcm,
        river_basin=dam_in.river_basin,
        commission_year=dam_in.commission_year,
        latitude=dam_in.latitude,
        longitude=dam_in.longitude,
        operator_name=dam_in.operator_name or current_user.full_name,
        status=dam_in.status
    )
    db.add(new_dam)
    db.commit()
    db.refresh(new_dam)

    # Default structural zones if none provided
    zones_to_create = dam_in.zones if dam_in.zones else [
        DamZoneCreate(zone_name="Upstream Face", criticality="HIGH", description="Water contact concrete face"),
        DamZoneCreate(zone_name="Downstream Face", criticality="HIGH", description="Exposed concrete slope"),
        DamZoneCreate(zone_name="Spillway & Gates", criticality="CRITICAL", description="Discharge channel & crest gates"),
        DamZoneCreate(zone_name="Crest Roadway", criticality="MEDIUM", description="Top dam roadway"),
        DamZoneCreate(zone_name="Stilling Basin", criticality="HIGH", description="Energy dissipation basin")
    ]

    for z in zones_to_create:
        zone_obj = DamZone(
            dam_id=new_dam.id,
            zone_name=z.zone_name,
            criticality=z.criticality,
            description=z.description
        )
        db.add(zone_obj)
    db.commit()
    db.refresh(new_dam)

    # Log audit entry
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="CREATE_DAM",
        entity_type="Dam",
        entity_id=str(new_dam.id),
        new_value=f"Registered Dam: {new_dam.name} ({new_dam.code})"
    )
    db.add(audit)
    db.commit()

    return new_dam

@router.get("/{dam_id}", response_model=DamOut)
def get_dam(dam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")
    return dam

@router.post("/{dam_id}/zones", response_model=DamZoneOut, status_code=status.HTTP_201_CREATED)
def add_dam_zone(
    dam_id: int,
    zone_in: DamZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.AUTHORITY, UserRole.DAM_OPERATOR, UserRole.INSPECTION_ENGINEER]))
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    zone = DamZone(
        dam_id=dam.id,
        zone_name=zone_in.zone_name,
        criticality=zone_in.criticality,
        description=zone_in.description
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone

@router.post("/{dam_id}/simulate-inundation")
def simulate_spillway_inundation(
    dam_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    water_level = float(payload.get("water_level_m", dam.height_meters or 100.0))
    discharge = float(payload.get("discharge_cusecs", 25000.0))
    gate_open_pct = float(payload.get("gate_open_percent", 50.0))
    rain_intensity = float(payload.get("rainfall_intensity_mm_hr", 20.0))

    # Hydrodynamic calculation heuristics
    # Wave front speed (m/s) proportional to square root of discharge & water head
    wave_velocity_ms = round(4.5 + (discharge / 10000.0) * 1.8 + (rain_intensity / 50.0), 2)
    peak_discharge_m3s = round(discharge * 0.0283168, 1)

    # Downstream time to inundation
    arrival_5km_min = round((5000.0 / (wave_velocity_ms * 60.0)), 1)
    arrival_15km_min = round((15000.0 / (wave_velocity_ms * 60.0)), 1)
    arrival_30km_min = round((30000.0 / (wave_velocity_ms * 60.0)), 1)

    # Affected settlement estimate
    severity_factor = (discharge / 10000.0) * (gate_open_pct / 50.0)
    affected_villages = max(2, int(4 * severity_factor))
    est_population_at_risk = int(affected_villages * 3800)

    # Risk level classification
    if discharge > 40000 or gate_open_pct > 80:
        inundation_risk_level = "CRITICAL_RED_ALERT"
        recommended_action = "IMMEDIATE EVACUATION: Issue Red Alert for Zone 1 (0-5km) & Zone 2 (5-15km). Open emergency sirens."
    elif discharge > 20000 or gate_open_pct > 50:
        inundation_risk_level = "HIGH_AMBER_ADVISORY"
        recommended_action = "PRECAUTIONARY CLEARANCE: Issue Amber Advisory. Restrict riverbed activities and alert downstream district control rooms."
    else:
        inundation_risk_level = "MODERATE_NORMAL"
        recommended_action = "ROUTINE MONITORING: Controlled spillway release within safe channel capacity."

    # Center coordinates around dam location
    lat = dam.latitude or 30.3751
    lng = dam.longitude or 78.4852

    # Synthesize color-coded downstream inundation zone polygons
    zones = [
        {
            "zone_id": 1,
            "name": "Zone 1: Immediate Riparian Floodplain (0 - 5 km)",
            "risk_category": "CRITICAL_RED",
            "color": "#B3261E",
            "arrival_time_min": arrival_5km_min,
            "max_water_depth_meters": round(3.5 + (discharge / 15000.0), 1),
            "villages_affected": ["Rampur Downstream", "Govindpur Riverbed"],
            "coordinates": [
                [lat, lng],
                [lat - 0.015, lng + 0.010],
                [lat - 0.035, lng + 0.025],
                [lat - 0.040, lng + 0.018],
                [lat, lng]
            ]
        },
        {
            "zone_id": 2,
            "name": "Zone 2: Secondary Downstream Buffer (5 - 15 km)",
            "risk_category": "HIGH_AMBER",
            "color": "#C98A00",
            "arrival_time_min": arrival_15km_min,
            "max_water_depth_meters": round(1.8 + (discharge / 25000.0), 1),
            "villages_affected": ["Kalyanpur Settlement", "Neelkanth Bridge Area", "Shantipur Valley"],
            "coordinates": [
                [lat - 0.035, lng + 0.025],
                [lat - 0.080, lng + 0.050],
                [lat - 0.095, lng + 0.040],
                [lat - 0.040, lng + 0.018]
            ]
        },
        {
            "zone_id": 3,
            "name": "Zone 3: Extended Drainage Basin (15 - 30 km)",
            "risk_category": "ADVISORY_YELLOW",
            "color": "#1F4E79",
            "arrival_time_min": arrival_30km_min,
            "max_water_depth_meters": round(0.8 + (discharge / 40000.0), 1),
            "villages_affected": ["Haripur Suburb", "Lower Basin Agricultural Belt"],
            "coordinates": [
                [lat - 0.080, lng + 0.050],
                [lat - 0.150, lng + 0.090],
                [lat - 0.170, lng + 0.075],
                [lat - 0.095, lng + 0.040]
            ]
        }
    ]

    return {
        "dam_id": dam.id,
        "dam_name": dam.name,
        "simulation_parameters": {
            "water_level_m": water_level,
            "discharge_cusecs": discharge,
            "peak_discharge_m3s": peak_discharge_m3s,
            "gate_open_percent": gate_open_pct,
            "rainfall_intensity_mm_hr": rain_intensity
        },
        "wave_velocity_ms": wave_velocity_ms,
        "inundation_risk_level": inundation_risk_level,
        "recommended_action": recommended_action,
        "estimated_population_at_risk": est_population_at_risk,
        "affected_villages_count": affected_villages,
        "arrival_times": {
            "zone_1_5km_min": arrival_5km_min,
            "zone_2_15km_min": arrival_15km_min,
            "zone_3_30km_min": arrival_30km_min
        },
        "inundation_zones": zones
    }

