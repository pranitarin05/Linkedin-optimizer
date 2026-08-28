from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.parsers.pdf_parser import parse_pdf
from app.parsers.docx_parser import parse_docx

router = APIRouter()


class ExtractRequest(BaseModel):
    section: str
    target_role: Optional[str] = None


class GenerateRequest(BaseModel):
    source: str  # "cv" or "custom"
    section: str
    custom_text: Optional[str] = None
    target_role: Optional[str] = None
    keywords: Optional[List[str]] = None


class GenerateResponse(BaseModel):
    draft: str
    match_score: int
    section: str
    source: str
    applied_rules: List[str]


@router.post("/extract")
async def extract_cv(file: UploadFile = File(...), section: str = ""):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()

    if file.filename.endswith(".pdf"):
        result = parse_pdf(content)
    elif file.filename.endswith((".docx", ".doc")):
        result = parse_docx(content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use PDF or DOCX.")

    return {"extracted": result, "section": section}


@router.post("/generate", response_model=GenerateResponse)
async def generate_content(request: GenerateRequest):
    # TODO: Integrate LangGraph pipeline
    # For now, return a placeholder
    return GenerateResponse(
        draft=f"Optimized content for {request.section}",
        match_score=75,
        section=request.section,
        source=request.source,
        applied_rules=["placeholder"],
    )
