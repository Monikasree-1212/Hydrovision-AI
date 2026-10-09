from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.base import get_db
from app.database.models import Dam, Defect, RiskAssessment, User
from app.schemas.schemas import RiskAssessmentOut
from app.auth.auth import get_current_user

router = APIRouter(prefix="/risk", tags=["Risk Engine"])

@router.get("/{dam_id}", response_model=RiskAssessmentOut)
def calculate_dam_risk(dam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    defects = db.query(Defect).filter(Defect.dam_id == dam_id).all()

    if not defects:
        # Base healthy condition if no defects recorded
        assessment = RiskAssessment(
            dam_id=dam.id,
            risk_score=0.0,
            risk_level="LOW",
            condition_index=100.0,
            condition_rating="GOOD",
            contributing_factors=["No active verified defects recorded in database."]
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        return assessment


    # Explainable calculation formula based on actual backend defects
    score = 15.0
    factors = []

    critical_count = sum(1 for d in defects if d.severity == "CRITICAL" or str(d.severity) == "CRITICAL")
    high_count = sum(1 for d in defects if d.severity == "HIGH" or str(d.severity) == "HIGH")
    medium_count = sum(1 for d in defects if d.severity == "MEDIUM" or str(d.severity) == "MEDIUM")

    if critical_count > 0:
        score += critical_count * 25.0
        factors.append(f"{critical_count} critical structural defect(s) verified.")
    if high_count > 0:
        score += high_count * 15.0
        factors.append(f"{high_count} high-severity defect(s) active.")
    if medium_count > 0:
        score += medium_count * 5.0
        factors.append(f"{medium_count} medium-severity defect(s) under observation.")

    # Check for seepage or spillway defects
    seepage_defects = [d for d in defects if d.defect_type == "SEEPAGE"]
    if seepage_defects:
        score += 15.0
        factors.append("Active concrete seepage detected on structure.")

    risk_score = round(min(100.0, score), 1)

    if risk_score >= 75.0:
        risk_level = "CRITICAL"
        condition_rating = "CRITICAL"
        condition_index = max(10.0, round(100.0 - risk_score, 1))
    elif risk_score >= 50.0:
        risk_level = "HIGH"
        condition_rating = "ATTENTION_REQUIRED"
        condition_index = round(100.0 - risk_score, 1)
    elif risk_score >= 25.0:
        risk_level = "MODERATE"
        condition_rating = "WATCH"
        condition_index = round(100.0 - risk_score, 1)
    else:
        risk_level = "LOW"
        condition_rating = "GOOD"
        condition_index = round(100.0 - risk_score, 1)

    assessment = RiskAssessment(
        dam_id=dam.id,
        risk_score=risk_score,
        risk_level=risk_level,
        condition_index=condition_index,
        condition_rating=condition_rating,
        contributing_factors=factors
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment
