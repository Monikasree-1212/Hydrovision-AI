from datetime import datetime
from app.database.base import engine, Base, SessionLocal
import app.database.models as models
from app.database.models import User, UserRole, DigitalTwinModel, PublicComplaint, Dam, Defect
from app.auth.auth import get_password_hash

from sqlalchemy import inspect, text

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check SQLite missing columns for dams and defects
        inspector = inspect(engine)
        if inspector.has_table('dams'):
            dam_cols = [c['name'] for c in inspector.get_columns('dams')]
            with engine.connect() as conn:
                if 'geometry' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN geometry TEXT;"))
                if 'location_label' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN location_label VARCHAR(100) DEFAULT 'Dam Reference Location';"))
                if 'dam_category' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN dam_category VARCHAR(50) DEFAULT 'MAJOR';"))
                if 'engineer_in_charge' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN engineer_in_charge VARCHAR(255);"))
                if 'history_summary' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN history_summary TEXT;"))
                if 'photos_json' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN photos_json JSON;"))
                if 'supreme_rating' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN supreme_rating FLOAT DEFAULT 4.5;"))
                if 'rating_grade' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN rating_grade VARCHAR(10) DEFAULT 'A';"))
                if 'rating_comments' not in dam_cols:
                    conn.execute(text("ALTER TABLE dams ADD COLUMN rating_comments TEXT;"))
                conn.commit()

        if inspector.has_table('defects'):
            defect_cols = [c['name'] for c in inspector.get_columns('defects')]
            with engine.connect() as conn:
                if 'geometry' not in defect_cols:
                    conn.execute(text("ALTER TABLE defects ADD COLUMN geometry TEXT;"))
                if 'coordinate_source' not in defect_cols:
                    conn.execute(text("ALTER TABLE defects ADD COLUMN coordinate_source VARCHAR(50) DEFAULT 'UNAVAILABLE';"))
                if 'location_precision' not in defect_cols:
                    conn.execute(text("ALTER TABLE defects ADD COLUMN location_precision VARCHAR(50) DEFAULT 'UNAVAILABLE';"))
                if 'coordinate_accuracy_meters' not in defect_cols:
                    conn.execute(text("ALTER TABLE defects ADD COLUMN coordinate_accuracy_meters FLOAT;"))
                conn.commit()

        # Ensure Supreme Command account exists
        supreme_user = db.query(User).filter(User.role == UserRole.SUPREME_COMMAND).first()
        if not supreme_user:
            supreme_user = User(
                email="supreme.command@hydrovision.gov.in",
                hashed_password=get_password_hash("SupremeCommand#2026!"),
                full_name="National Supreme Commander — NDSA Headquarters",
                role=UserRole.SUPREME_COMMAND,
                department="Central Dam Safety Organisation (CDSO) — Supreme Oversight Directorate",
                is_active=True
            )
            db.add(supreme_user)
            db.commit()

        # Check if users already seeded
        if db.query(User).filter(User.role == UserRole.AUTHORITY).count() == 0:
            users_to_create = [
                User(
                    email="authority@hydrovision.gov.in",
                    hashed_password=get_password_hash("authority123"),
                    full_name="Government Authority Portal",
                    role=UserRole.AUTHORITY,
                    department="Central Dam Safety Organisation",
                    is_active=True
                ),
                User(
                    email="operator@hydrovision.gov.in",
                    hashed_password=get_password_hash("operator123"),
                    full_name="Dam Operator Portal",
                    role=UserRole.DAM_OPERATOR,
                    department="Bhakra Beas Management Board",
                    is_active=True
                ),
                User(
                    email="engineer@hydrovision.gov.in",
                    hashed_password=get_password_hash("engineer123"),
                    full_name="Inspection Engineer Portal",
                    role=UserRole.INSPECTION_ENGINEER,
                    department="Hydroelectric Structural Inspection Cell",
                    is_active=True
                ),
                User(
                    email="manager@hydrovision.gov.in",
                    hashed_password=get_password_hash("manager123"),
                    full_name="Maintenance Manager Portal",
                    role=UserRole.MAINTENANCE_MANAGER,
                    department="Civil Maintenance Wing",
                    is_active=True
                )
            ]
            db.add_all(users_to_create)
            db.commit()
            print("Successfully initialized database tables and default RBAC accounts.")

        print("Database schema and RBAC user accounts verified successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
