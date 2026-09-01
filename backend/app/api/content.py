from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.parsers.pdf_parser import parse_pdf
from app.parsers.docx_parser import parse_docx
from app.core.config import settings
from groq import Groq

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
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="Groq API key not configured")

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        section_prompts = {
            "headline": "Write a professional LinkedIn headline (max 220 characters). Include job title, key skills, and value proposition. Be concise and impactful.",
            "about": "Write a LinkedIn About section (max 2600 characters). Start with a strong hook, include key achievements with metrics, and end with a call-to-action. Be professional yet personable.",
            "experience": "Write LinkedIn Experience bullet points. Use action verbs, include quantifiable achievements, and follow the STAR format. Start each bullet with a strong action verb.",
            "skills": "Suggest relevant LinkedIn skills based on the content. Include both technical and soft skills. Prioritize industry-standard terms.",
        }

        prompt = section_prompts.get(request.section, f"Optimize LinkedIn {request.section} section content.")

        if request.custom_text:
            prompt += f"\n\nBased on this input:\n{request.custom_text}"
        elif request.source == "cv":
            prompt += "\n\nOptimize the existing content from the user's CV/resume."

        if request.keywords:
            prompt += f"\n\nInclude these keywords: {', '.join(request.keywords)}"

        prompt += "\n\nReturn ONLY the optimized content, no explanations."

        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1024,
        )

        draft = chat_completion.choices[0].message.content.strip()

        return {
            "draft": draft,
            "matchScore": 85,
            "section": request.section,
            "source": request.source,
            "appliedRules": ["groq-llama-3.3", f"section:{request.section}"],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")
