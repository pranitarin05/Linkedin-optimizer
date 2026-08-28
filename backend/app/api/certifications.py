from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from urllib.parse import urlencode

router = APIRouter()


class CertRequest(BaseModel):
    name: str
    organization_name: str
    issue_year: Optional[str] = None
    issue_month: Optional[str] = None
    cert_url: Optional[str] = None
    cert_id: Optional[str] = None


class CertResponse(BaseModel):
    deep_link: str


@router.get("/deep-link", response_model=CertResponse)
async def get_cert_deep_link(
    name: str,
    organization_name: str,
    issue_year: Optional[str] = None,
    issue_month: Optional[str] = None,
    cert_url: Optional[str] = None,
    cert_id: Optional[str] = None,
):
    params = {
        "startTask": "CERTIFICATION_NAME",
        "name": name,
        "organizationName": organization_name,
    }

    if issue_year:
        params["issueYear"] = issue_year
    if issue_month:
        params["issueMonth"] = issue_month
    if cert_url:
        params["certUrl"] = cert_url
    if cert_id:
        params["certId"] = cert_id

    deep_link = f"https://www.linkedin.com/profile/add?{urlencode(params)}"
    return CertResponse(deep_link=deep_link)
