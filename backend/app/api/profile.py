from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from app.core.scorer import score_profile

router = APIRouter()


class ProfileScrapeRequest(BaseModel):
    profileUrl: str
    scrapedAt: str
    sections: Dict[str, Any]


class SectionScore(BaseModel):
    score: int
    status: str
    issues: List[str]
    tips: List[str]


class ScoringResponse(BaseModel):
    overallScore: int
    sections: Dict[str, SectionScore]


@router.post("/score", response_model=ScoringResponse)
async def score_profile_endpoint(request: ProfileScrapeRequest):
    result = score_profile(request.sections)
    return ScoringResponse(**result)
