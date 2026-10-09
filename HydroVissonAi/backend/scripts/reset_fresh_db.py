import os
import shutil
import sqlite3

def reset_database_and_storage():
    db_path = "hydrovision.db"
    storage_dir = "storage"

    # Close any open connection and remove old DB file
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print(f"Removed old database file: {db_path}")
        except Exception as e:
            print(f"Warning: Could not remove DB file: {e}")

    # Remove contents of storage directory except standard structure
    if os.path.exists(storage_dir):
        try:
            shutil.rmtree(storage_dir)
            print(f"Cleared old storage directory: {storage_dir}")
        except Exception as e:
            print(f"Warning: Could not clear storage dir: {e}")

    os.makedirs(storage_dir, exist_ok=True)
    os.makedirs(os.path.join(storage_dir, "reports"), exist_ok=True)

    # Initialize fresh database schema and default seed data
    from app.database.seed import init_db
    init_db()
    print("Database and storage reset completed successfully.")

if __name__ == "__main__":
    reset_database_and_storage()
