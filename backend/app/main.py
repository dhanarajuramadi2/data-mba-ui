
from fastapi import FastAPI

from app.api.routes.files import router as files_router

app = FastAPI(
    title="DataMBA API",
    description="Backend API for DataMBA data management platform",
    version="0.1.0",
)

app.include_router(files_router)


@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "datamba-api",
        "message": "DataMBA backend is running",
    }
