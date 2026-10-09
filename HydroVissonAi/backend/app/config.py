import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "HydroVision AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "hydrovision-ai-super-secret-government-key-change-in-production"
    API_V1_STR: str = "/api/v1"
    
    # Database & Cache
    DATABASE_URL: str = "sqlite:///./hydrovision.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT
    JWT_SECRET: str = "hydrovision-jwt-secret-key-32-bytes-minimum-security"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"]
    
    # Object Storage Abstraction (LOCAL, S3, MINIO)
    OBJECT_STORAGE: str = "LOCAL"
    S3_ENDPOINT: str = "localhost:9000"
    S3_BUCKET: str = "hydrovision-media"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "hydrovision-media"
    
    # AI Models
    YOLO_MODEL_PATH: str = "./models/yolo11_dam_defects.pt"
    YOLO_CONFIDENCE_THRESHOLD: float = 0.20
    YOLO_IOU_THRESHOLD: float = 0.45
    YOLO_DEVICE: str = "cpu"
    XGBOOST_MODEL_PATH: str = "./models/xgboost_deterioration.json"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
