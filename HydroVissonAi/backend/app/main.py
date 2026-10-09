import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.seed import init_db

# Routers
from app.auth.auth import router as auth_router
from app.dams.dams import router as dams_router
from app.inspections.inspections import router as inspections_router
from app.uploads.uploads import router as uploads_router
from app.ai.router import router as ai_router
from app.defects.defects import router as defects_router
from app.gis.gis import router as gis_router
from app.digital_twin.digital_twin import router as digital_twin_router
from app.risk.risk import router as risk_router
from app.prediction.prediction import router as prediction_router
from app.maintenance.maintenance import router as maintenance_router
from app.reports.reports import router as reports_router
from app.alerts.alerts import router as alerts_router
from app.audit.audit import router as audit_router
from app.historical.router import router as historical_router
from app.telemetry.telemetry import router as telemetry_router
from app.eap.eap import router as eap_router
from app.ndsa.ndsa import router as ndsa_router
from app.supreme.supreme import router as supreme_router
from app.public_grievance.router import router as public_grievance_router

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Assisted Dam Inspection & Predictive Maintenance Decision Support System — Government Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers with API_V1_STR prefix
prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=prefix)
app.include_router(dams_router, prefix=prefix)
app.include_router(inspections_router, prefix=prefix)
app.include_router(uploads_router, prefix=prefix)
app.include_router(ai_router, prefix=prefix)
app.include_router(defects_router, prefix=prefix)
app.include_router(gis_router, prefix=prefix)
app.include_router(digital_twin_router, prefix=prefix)
app.include_router(risk_router, prefix=prefix)
app.include_router(prediction_router, prefix=prefix)
app.include_router(maintenance_router, prefix=prefix)
app.include_router(reports_router, prefix=prefix)
app.include_router(alerts_router, prefix=prefix)
app.include_router(audit_router, prefix=prefix)
app.include_router(historical_router, prefix=prefix)
app.include_router(telemetry_router, prefix=prefix)
app.include_router(eap_router, prefix=prefix)
app.include_router(ndsa_router, prefix=prefix)
app.include_router(supreme_router, prefix=prefix)
app.include_router(public_grievance_router, prefix=prefix)


@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def root():
    return {
        "system": settings.APP_NAME,
        "status": "OPERATIONAL",
        "notice": "Official Infrastructure Decision Support System",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
