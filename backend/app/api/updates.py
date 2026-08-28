from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


class ApproveRequest(BaseModel):
    user_id: str
    section: str
    old_value: str
    new_value: str
    source: str  # "cv" or "custom"


class ApproveResponse(BaseModel):
    id: str
    status: str
    approved_at: str


@router.post("/approve", response_model=ApproveResponse)
async def approve_update(request: ApproveRequest):
    # TODO: Save to Supabase profile_updates table
    update_id = "placeholder-id"
    return ApproveResponse(
        id=update_id,
        status="approved",
        approved_at=datetime.now().isoformat(),
    )
