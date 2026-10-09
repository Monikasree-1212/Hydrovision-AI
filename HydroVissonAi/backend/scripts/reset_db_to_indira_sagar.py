import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "hydrovision.db")

def reset_db():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Remove all dams and child tables
    c.execute("DELETE FROM dams;")
    c.execute("DELETE FROM inspections;")
    c.execute("DELETE FROM defects;")
    c.execute("DELETE FROM maintenance_work_orders;")
    c.execute("DELETE FROM digital_twin_models;")
    c.execute("DELETE FROM risk_assessments;")
    c.execute("DELETE FROM alerts;")
    c.execute("DELETE FROM public_complaints;")
    c.execute("DELETE FROM supreme_command_directives;")
    conn.commit()

    print("Cleaned database! All mock dams and records removed.")
    conn.close()

if __name__ == "__main__":
    reset_db()
