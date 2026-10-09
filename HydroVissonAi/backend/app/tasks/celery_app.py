from celery import Celery
from app.config import settings

redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "hydrovision_tasks",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)
