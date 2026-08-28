from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import profile, content, updates, certifications
from app.core.config import settings

app = FastAPI(
    title="LinkedIn Profile Optimizer API",
    description="Backend API for LinkedIn profile scoring, content generation, and updates.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(content.router, prefix="/content", tags=["content"])
app.include_router(updates.router, prefix="/updates", tags=["updates"])
app.include_router(certifications.router, prefix="/certifications", tags=["certifications"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
