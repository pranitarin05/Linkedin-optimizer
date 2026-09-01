from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.parsers.pdf_parser import parse_pdf
from app.parsers.docx_parser import parse_docx
from app.core.config import settings
from groq import Groq

router = APIRouter()


class GenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source: str  # "cv" or "custom"
    section: str
    custom_text: Optional[str] = None
    customText: Optional[str] = None
    target_role: Optional[str] = None
    targetRole: Optional[str] = None
    keywords: Optional[List[str]] = None
    current_headline: Optional[str] = None
    currentHeadline: Optional[str] = None
    current_about: Optional[str] = None
    currentAbout: Optional[str] = None


SECTION_SYSTEM_PROMPTS = {
    "headline": """You are an expert LinkedIn profile optimizer. Rewrite the user's LinkedIn headline.

RULES:
- Maximum 220 characters
- Format: [Job Title] | [Key Skills] | [Value Proposition]
- Use power words: Led, Built, Drove, Scaled, Delivered, Launched
- Include 2-3 high-impact keywords for recruiter search
- No hashtags, no emojis, no clichés like "passionate" or "results-driven"
- Must sound human, not AI-generated

EXAMPLES OF GREAT HEADLINES:
- "Senior Software Engineer | Python, AWS, Microservices | Building systems that handle 10M+ daily users"
- "Product Manager | B2B SaaS | Turning complex problems into products users love"
- "Data Scientist | ML/AI | Helping companies make better decisions with data"

Return ONLY the optimized headline text, nothing else.""",

    "about": """You are an expert LinkedIn profile optimizer. Rewrite the user's About section.

RULES:
- Maximum 2600 characters (aim for 1500-2000)
- Structure: Hook line → 2-3 paragraphs of achievements → Skills/interests → Call-to-action
- First line must be a compelling hook (this is what people see before "see more")
- Use first person ("I" not "he/she")
- Include 3-5 quantifiable achievements (numbers, %, $, time saved)
- Use short paragraphs (2-3 sentences max)
- End with a CTA: "Let's connect" or "Open to opportunities in X"
- No buzzwords: passionate, results-driven, go-getter, team player, detail-oriented

EXAMPLE STRUCTURE:
"I've spent 8 years turning messy data pipelines into systems that process 50TB daily.

At [Company], I led the migration from monolith to microservices, reducing deployment time from 2 hours to 12 minutes. This saved the engineering team 2,000+ hours annually.

Previously, I built the recommendation engine at [Startup] that increased user engagement by 34% in 6 months.

I specialize in: Python, AWS, Kubernetes, Data Engineering, System Design

Currently open to senior engineering roles. Let's connect at [email]."

Return ONLY the optimized About text, nothing else.""",

    "experience": """You are an expert LinkedIn profile optimizer. Rewrite the experience entries.

RULES FOR EACH BULLET POINT:
- Start with a strong action verb (Led, Built, Designed, Implemented, Reduced, Launched)
- Include quantifiable results: numbers, percentages, dollar amounts, time saved
- Follow format: [Action verb] + [What you did] + [Measurable result]
- 3-5 bullet points per role
- Focus on impact, not responsibilities
- No buzzwords or filler

EXAMPLE BULLET POINTS:
- "Architected real-time data pipeline processing 2M+ events/day using Kafka and Flink, reducing data latency from 4 hours to 30 seconds"
- "Led team of 5 engineers to deliver mobile app rewrite, achieving 99.9% uptime and 4.8-star App Store rating"
- "Reduced cloud infrastructure costs by 40% ($120K/year) by implementing auto-scaling and right-sizing EC2 instances"

Format each entry as:
**[Job Title]** at [Company]
[Date Range]

• [Bullet 1]
• [Bullet 2]
• [Bullet 3]

Return ONLY the optimized experience entries, nothing else.""",

    "skills": """You are an expert LinkedIn profile optimizer. Suggest relevant skills.

RULES:
- Return 15-25 skills as a comma-separated list
- Include both technical skills (languages, tools, frameworks) and soft skills
- Use exact skill names that recruiters search for on LinkedIn
- Prioritize industry-standard terms over company-specific jargon
- Order by relevance to the provided content

Format as:
Skill 1, Skill 2, Skill 3, ...

Return ONLY the comma-separated skills, nothing else.""",

    "education": """You are an expert LinkedIn profile optimizer. Rewrite the education section.

RULES:
- Include degree, field of study, university name
- Add relevant coursework, honors, GPA (if 3.5+)
- Include activities, clubs, leadership roles
- Keep concise: 2-3 lines per entry

Return ONLY the optimized education text, nothing else.""",

    "certifications": """You are an expert LinkedIn profile optimizer. Format certifications professionally.

RULES:
- Include full certification name, issuing organization, date
- Add credential ID if provided
- Order by relevance and recency

Return ONLY the optimized certification entries, nothing else.""",
}

USER_PROMPT_TEMPLATES = {
    "headline": """Current headline: "{current_content}"

CV/Resume content for context:
{input_content}

{keywords_prompt}

Rewrite this headline to be more impactful and recruiter-friendly.""",

    "about": """Current About section: "{current_content}"

CV/Resume content for context:
{input_content}

{keywords_prompt}

Rewrite this About section to be compelling and achievement-focused.""",

    "experience": """Current experience: "{current_content}"

CV/Resume content for context:
{input_content}

{keywords_prompt}

Rewrite these experience entries with stronger impact statements and metrics.""",

    "skills": """Current skills: "{current_content}"

CV/Resume content for context:
{input_content}

Suggest the best skills to list based on this content.""",
}


def _get_text_input(request: GenerateRequest) -> str:
    custom = request.custom_text or request.customText or ""
    if custom:
        return custom
    if request.source == "cv":
        return "(CV content was uploaded - optimize based on the current content provided)"
    return ""


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


@router.post("/generate")
async def generate_content(request: GenerateRequest):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="Groq API key not configured")

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        input_text = _get_text_input(request)
        current_content = (
            request.current_headline or request.currentHeadline or ""
            if request.section == "headline"
            else request.current_about or request.currentAbout or ""
        ) if request.section in ("headline", "about") else (
            request.custom_text or request.customText or ""
        )

        system_prompt = SECTION_SYSTEM_PROMPTS.get(
            request.section,
            f"Optimize the LinkedIn {request.section} section. Return ONLY the optimized content."
        )

        keywords_list = request.keywords or []
        keywords_prompt = f"Target keywords to include: {', '.join(keywords_list)}" if keywords_list else ""

        user_template = USER_PROMPT_TEMPLATES.get(request.section)
        if user_template:
            user_prompt = user_template.format(
                current_content=current_content or "(empty - needs to be created)",
                input_content=input_text or "(no additional content provided)",
                keywords_prompt=keywords_prompt,
            )
        else:
            user_prompt = f"Optimize this LinkedIn {request.section} section:\n\n{input_text}\n\n{keywords_prompt}"

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model="qwen/qwen3.6-27b",
            temperature=0.7,
            max_tokens=1024,
        )

        draft = chat_completion.choices[0].message.content.strip()

        # Remove <think>...</think> blocks if the model includes reasoning
        import re
        draft = re.sub(r"<think>.*?</think>", "", draft, flags=re.DOTALL).strip()

        # Calculate rough match score based on content quality signals
        score = 50
        if len(draft) > 50: score += 10
        if any(c.isdigit() for c in draft): score += 10  # has numbers/metrics
        if request.section == "headline" and len(draft) <= 220: score += 10
        if draft.count("•") >= 2 or draft.count("\n") >= 2: score += 10  # structured
        score = min(score, 95)

        applied_rules = [f"model:qwen-3.6-27b", f"section:{request.section}"]
        if keywords_list:
            applied_rules.append(f"keywords:{len(keywords_list)}")

        return {
            "draft": draft,
            "matchScore": score,
            "section": request.section,
            "source": request.source,
            "appliedRules": applied_rules,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")
