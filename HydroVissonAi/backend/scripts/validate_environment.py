import os
import sys
import json
import shutil
import subprocess
from datetime import datetime, timezone


def check_mark(condition: bool) -> str:
    return "[OK] PASSED" if condition else "[FAIL] FAILED"


def validate_full_environment():
    """
    Automated Environment Validation Script per Requirement 18.
    Verifies Python, Node.js, Database, PostGIS/Spatial libraries, PyTorch,
    Ultralytics, YOLO11 model weights, OpenCV, 3D assets, and package configurations.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
        
    print("=========================================================")
    print("=== HydroVision AI — Enterprise Environment Validation ===")
    print("=========================================================\n")
    
    results = {}

    
    # 1. Python Environment Check
    py_ver = sys.version.split()[0]
    print(f"1. Python Runtime: {py_ver} -> {check_mark(sys.version_info >= (3, 10))}")
    results["Python Runtime"] = sys.version_info >= (3, 10)
    
    # 2. Node.js Check
    node_ok = False
    node_ver = "Unknown"
    try:
        res = subprocess.run(["node", "-v"], capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            node_ok = True
            node_ver = res.stdout.strip()
    except Exception:
        pass
    print(f"2. Node.js Engine: {node_ver} -> {check_mark(node_ok)}")
    results["Node.js Engine"] = node_ok
    
    # 3. Database Check
    db_ok = False
    try:
        from app.database.base import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        print(f"   Database connection detail: {e}")
    print(f"3. Relational Database Connection -> {check_mark(db_ok)}")
    results["Relational Database"] = db_ok

    
    # 4. PyTorch & GPU/CPU Accelerator Check
    torch_ok = False
    device_name = "CPU"
    try:
        import torch
        torch_ok = True
        device_name = "CUDA GPU (" + torch.cuda.get_device_name(0) + ")" if torch.cuda.is_available() else "CPU"
    except ImportError:
        pass
    print(f"4. PyTorch Machine Learning Engine ({device_name}) -> {check_mark(torch_ok)}")
    results["PyTorch Engine"] = torch_ok
    
    # 5. Ultralytics YOLO11 Package Check
    yolo_pkg_ok = False
    yolo_ver = "None"
    try:
        import ultralytics
        yolo_pkg_ok = True
        yolo_ver = ultralytics.__version__
    except ImportError:
        pass
    print(f"5. Ultralytics YOLO Package (v{yolo_ver}) -> {check_mark(yolo_pkg_ok)}")
    results["Ultralytics YOLO Package"] = yolo_pkg_ok
    
    # 6. YOLO11 Pretrained Model Weights File
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    weights_path = os.path.join(backend_dir, "models", "yolo11", "yolo11n.pt")
    if not os.path.exists(weights_path):
        weights_path = os.path.join(backend_dir, "models", "yolo11_dam_defects.pt")
    weights_ok = os.path.exists(weights_path)
    print(f"6. YOLO11 Pretrained Model Weights ({os.path.basename(weights_path)}) -> {check_mark(weights_ok)}")
    results["YOLO11 Model Weights"] = weights_ok
    
    # 7. Model Loading Verification
    model_load_ok = False
    if weights_ok and yolo_pkg_ok:
        try:
            from ultralytics import YOLO
            m = YOLO(weights_path)
            model_load_ok = m is not None
        except Exception:
            pass
    print(f"7. YOLO11 Real Model Load Test -> {check_mark(model_load_ok)}")
    results["YOLO11 Model Loading"] = model_load_ok
    
    # 8. OpenCV Vision Engine Check
    cv_ok = False
    try:
        import cv2
        cv_ok = True
    except ImportError:
        pass
    print(f"8. OpenCV Computer Vision Engine -> {check_mark(cv_ok)}")
    results["OpenCV Computer Vision Engine"] = cv_ok
    
    # 9. Spatial / PostGIS Libraries Check
    spatial_ok = False
    try:
        import shapely
        import geopandas
        spatial_ok = True
    except ImportError:
        pass
    print(f"9. GIS & Spatial Libraries (Shapely, GeoPandas) -> {check_mark(spatial_ok)}")
    results["GIS & Spatial Libraries"] = spatial_ok
    
    # 10. 3D Digital Twin Sample Asset Check
    twin_asset_backend = os.path.join(backend_dir, "uploads", "3d_models", "standard_dam_sample.glb")
    frontend_dir = os.path.abspath(os.path.join(backend_dir, "..", "frontend"))
    twin_asset_frontend = os.path.join(frontend_dir, "public", "models", "standard_dam_sample.glb")
    twin_asset_ok = os.path.exists(twin_asset_backend) and os.path.exists(twin_asset_frontend)
    print(f"10. 3D Digital Twin GLB Engineering Asset -> {check_mark(twin_asset_ok)}")
    results["3D Digital Twin Asset"] = twin_asset_ok
    
    print("\n---------------------------------------------------------")
    all_passed = all(results.values())
    overall_status = "ALL SYSTEMS FUNCTIONAL & READY" if all_passed else "SOME DEPENDENCIES REQUIRE ATTENTION"
    print(f"OVERALL SYSTEM STATUS: {overall_status}")
    print("---------------------------------------------------------\n")
    
    # Log report to validation_log.json
    log_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "overall_status": overall_status,
        "all_passed": all_passed,
        "results": results
    }

    log_path = os.path.join(backend_dir, "models", "yolo11", "validation_log.json")
    try:
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "w") as f:
            json.dump(log_data, f, indent=2)
        print(f"Validation summary log saved to: {log_path}\n")
    except Exception:
        pass

    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    validate_full_environment()
