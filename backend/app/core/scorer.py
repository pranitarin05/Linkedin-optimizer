from typing import Dict, List, Any

# Rule-based scoring engine
# Each section has rules that evaluate completeness, length, and quality

HEADLINE_RULES = [
    {"name": "exists", "weight": 20, "check": lambda s: len(s) > 0},
    {"name": "min_length", "weight": 20, "check": lambda s: len(s) >= 40},
    {"name": "optimal_length", "weight": 10, "check": lambda s: 40 <= len(s) <= 220},
]

ABOUT_RULES = [
    {"name": "exists", "weight": 15, "check": lambda s: len(s) > 0},
    {"name": "min_length", "weight": 20, "check": lambda s: len(s) >= 200},
    {"name": "optimal_length", "weight": 15, "check": lambda s: 200 <= len(s) <= 2600},
]

EXPERIENCE_RULES = [
    {"name": "has_entries", "weight": 20, "check": lambda items: len(items) > 0},
    {"name": "min_entries", "weight": 15, "check": lambda items: len(items) >= 2},
    {"name": "has_descriptions", "weight": 15, "check": lambda items: any(
        len(getattr(i, 'description', '') or '') > 50 for i in items
    )},
]

SKILLS_RULES = [
    {"name": "has_skills", "weight": 20, "check": lambda items: len(items) > 0},
    {"name": "min_skills", "weight": 20, "check": lambda items: len(items) >= 5},
]


def evaluate_rules(value: Any, rules: List[Dict]) -> tuple[int, List[str]]:
    score = 0
    issues = []

    for rule in rules:
        try:
            if rule["check"](value):
                score += rule["weight"]
            else:
                issues.append(f"Rule failed: {rule['name']}")
        except Exception:
            issues.append(f"Could not evaluate: {rule['name']}")

    return min(score, 100), issues


def get_status(score: int) -> str:
    if score >= 80:
        return "excellent"
    elif score >= 60:
        return "good"
    elif score >= 40:
        return "needs_work"
    return "critical"


def get_tips(section: str, score: int) -> List[str]:
    tips = {
        "headline": [
            "Include your job title and key skills",
            "Add value proposition (what you help companies do)",
            "Use relevant keywords for your industry",
        ],
        "about": [
            "Start with a strong opening line",
            "Include your professional story",
            "End with a call to action",
        ],
        "experience": [
            "Use bullet points for achievements",
            "Include metrics and numbers",
            "Start each bullet with an action verb",
        ],
        "skills": [
            "Add at least 5 relevant skills",
            "Include both technical and soft skills",
            "Pin your top 3 most important skills",
        ],
    }

    if score >= 80:
        return []

    return tips.get(section, ["Complete this section for a better score"])


def score_profile(sections: Dict[str, Any]) -> Dict:
    section_scores = {}

    # Score headline
    headline = sections.get("headline", {})
    headline_text = headline.get("text", "") if isinstance(headline, dict) else str(headline)
    h_score, h_issues = evaluate_rules(headline_text, HEADLINE_RULES)
    section_scores["headline"] = {
        "score": h_score,
        "status": get_status(h_score),
        "issues": h_issues,
        "tips": get_tips("headline", h_score),
    }

    # Score about
    about = sections.get("about", {})
    about_text = about.get("text", "") if isinstance(about, dict) else str(about)
    a_score, a_issues = evaluate_rules(about_text, ABOUT_RULES)
    section_scores["about"] = {
        "score": a_score,
        "status": get_status(a_score),
        "issues": a_issues,
        "tips": get_tips("about", a_score),
    }

    # Score experience
    experience = sections.get("experience", [])
    e_score, e_issues = evaluate_rules(experience, EXPERIENCE_RULES)
    section_scores["experience"] = {
        "score": e_score,
        "status": get_status(e_score),
        "issues": e_issues,
        "tips": get_tips("experience", e_score),
    }

    # Score skills
    skills = sections.get("skills", [])
    s_score, s_issues = evaluate_rules(skills, SKILLS_RULES)
    section_scores["skills"] = {
        "score": s_score,
        "status": get_status(s_score),
        "issues": s_issues,
        "tips": get_tips("skills", s_score),
    }

    # Calculate overall score (weighted average)
    weights = {"headline": 0.25, "about": 0.25, "experience": 0.3, "skills": 0.2}
    overall = sum(
        section_scores[s]["score"] * w for s, w in weights.items()
    )

    return {
        "overallScore": int(overall),
        "sections": section_scores,
    }
