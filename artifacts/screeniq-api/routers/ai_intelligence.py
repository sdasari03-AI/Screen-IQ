"""
AI Intelligence Panel — 5 sub-panels for deep candidate analysis.
Charge Classifier, Charge Explainer, Name Matcher, Role Matcher, Doc Inspector.
"""
import os
import json
import base64
from typing import Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from ai_service import get_openai_client
from database import get_db

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


# ─── Models ───────────────────────────────────────────────────────────────────

class ChargeInput(BaseModel):
    charge: str
    ruleset: str = "standard"  # "flag_felonies_only" | "ignore_traffic" | "standard"


class ExplainInput(BaseModel):
    charge: str
    category: str | None = None
    severity: str | None = None


# ─── Charge Classifier ────────────────────────────────────────────────────────

@router.post("/classify-charge")
def classify_charge(body: ChargeInput):
    """Classify a raw criminal charge string using GPT-4o."""
    ruleset_descriptions = {
        "flag_felonies_only": "Flag ONLY if category is Felony. Misdemeanors and infractions = Green.",
        "ignore_traffic": "Ignore all Traffic category charges regardless of severity. Flag everything else.",
        "standard": "Apply standard background screening criteria — flag felonies and violent misdemeanors.",
    }
    ruleset_desc = ruleset_descriptions.get(body.ruleset, ruleset_descriptions["standard"])

    prompt = f"""You are a criminal record analyst for a background screening company.

Charge string: "{body.charge}"
Employer ruleset: {ruleset_desc}

Classify this charge and apply the employer ruleset.

Respond in JSON:
{{
  "category": "Property|Violent|Drug|Traffic|White Collar|Other",
  "severity": "Felony|Misdemeanor|Infraction|Unknown",
  "disposition": "Convicted|Dismissed|Acquitted|Pending|Unknown",
  "summary": "One plain-language sentence describing what this charge means.",
  "ruleset_decision": "Flag|Review|Clear",
  "ruleset_reason": "One sentence explaining why the ruleset produced this decision."
}}"""

    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-5.6-luna",
        max_completion_tokens=512,
        messages=[
            {"role": "system", "content": "You are a criminal record classification expert. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    result = json.loads(response.choices[0].message.content)

    decision = result.get("ruleset_decision", "Review")
    badge = "green" if decision == "Clear" else ("red" if decision == "Flag" else "yellow")

    return {
        "charge": body.charge,
        "category": result.get("category", "Other"),
        "severity": result.get("severity", "Unknown"),
        "disposition": result.get("disposition", "Unknown"),
        "summary": result.get("summary", ""),
        "rulesetDecision": decision,
        "rulesetReason": result.get("ruleset_reason", ""),
        "badge": badge,
        "ruleset": body.ruleset,
    }


# ─── Charge Explainer ─────────────────────────────────────────────────────────

@router.post("/explain-charge")
def explain_charge(body: ExplainInput):
    """Explain a charge in plain language for fair hiring context."""
    prompt = f"""You are a legal aid advisor helping hiring managers understand criminal charges fairly.

Charge: "{body.charge}"
{f'Category: {body.category}' if body.category else ''}
{f'Severity: {body.severity}' if body.severity else ''}

Provide plain-language context for a fair hiring decision. Be factual and balanced.

Respond in JSON:
{{
  "plain_language": "2-3 sentence plain English explanation of what this charge means.",
  "typical_sentence_range": "e.g., 'Probation to 2 years depending on jurisdiction and prior record'",
  "relevant_statute": "e.g., 'Cal. Penal Code § 459' or 'varies by state'",
  "how_common": "e.g., 'Accounts for ~8% of all property crime arrests nationally (FBI UCR 2023)'",
  "fair_hiring_context": "2-3 sentences on what this charge may or may not indicate about job fitness, citing EEOC guidance where relevant.",
  "rehabilitation_indicators": "What factors typically suggest successful rehabilitation for this charge type."
}}"""

    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-5.6-luna",
        max_completion_tokens=700,
        messages=[
            {"role": "system", "content": "You are a legal aid advisor specializing in fair chance hiring. Be factual, balanced, and cite EEOC guidance where appropriate."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    result = json.loads(response.choices[0].message.content)

    return {
        "charge": body.charge,
        "plainLanguage": result.get("plain_language", ""),
        "typicalSentenceRange": result.get("typical_sentence_range", ""),
        "relevantStatute": result.get("relevant_statute", ""),
        "howCommon": result.get("how_common", ""),
        "fairHiringContext": result.get("fair_hiring_context", ""),
        "rehabilitationIndicators": result.get("rehabilitation_indicators", ""),
    }


# ─── Name Matcher ─────────────────────────────────────────────────────────────

@router.get("/name-matcher/{candidate_id}")
def name_matcher(candidate_id: int):
    """Generate alias variants for a candidate name and simulate alias search results."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT name, date_of_birth FROM candidates WHERE id = %s", (candidate_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Candidate not found")
            name, dob = row

    prompt = f"""You are an identity verification specialist for a background screening company.

Candidate name: "{name}"
Date of birth: {dob or "unknown"}

Generate realistic name variants that should be searched in criminal databases for thoroughness.
Consider: maiden names, common aliases, spelling variants, hyphenated combinations, cultural naming patterns.

Respond in JSON:
{{
  "variants": [
    {{
      "name": "variant name",
      "type": "maiden_name|alias|spelling_variant|nickname|hyphenated|cultural_variant",
      "confidence": <0-100 integer>,
      "reasoning": "brief explanation"
    }}
  ],
  "search_summary": {{
    "variants_searched": <number>,
    "records_returned": <number>,
    "new_matches_found": <number>,
    "recommendation": "brief recommendation for the reviewer"
  }}
}}

Generate 3-6 realistic variants. Set records_returned and new_matches_found as realistic simulation values."""

    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-5.6-luna",
        max_completion_tokens=700,
        messages=[
            {"role": "system", "content": "You are an identity verification specialist. Generate realistic name variants for database searches. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    result = json.loads(response.choices[0].message.content)

    return {
        "candidateName": name,
        "candidateId": candidate_id,
        "variants": result.get("variants", []),
        "searchSummary": result.get("search_summary", {}),
    }


# ─── Role Matcher ─────────────────────────────────────────────────────────────

@router.get("/role-matcher/{candidate_id}")
def role_matcher(candidate_id: int):
    """Compare claimed employment role against verification record."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.name, c.position, cr.details
                FROM candidates c
                LEFT JOIN check_results cr ON cr.screening_run_id = (
                    SELECT id FROM screening_runs WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1
                ) AND cr.check_type = 'employment'
                WHERE c.id = %s
            """, (candidate_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Candidate not found")
            name, position, emp_details = row

    details = emp_details if isinstance(emp_details, dict) else json.loads(emp_details or "{}")

    prompt = f"""You are an employment verification analyst.

Candidate: {name}
Claimed position/role: "{position}"
Employment verification record details: {json.dumps(details)}

Compare the claimed role against what was verified. Simulate a realistic verification outcome.

Respond in JSON:
{{
  "verdict": "Confirmed|Discrepancy|Fabrication|Unable to Verify",
  "claimed_title": "what the candidate claimed",
  "verified_title": "what the record shows (or null if unable to verify)",
  "claimed_employer": "employer from position field if detectable, else null",
  "verified_employer": "employer from verification record",
  "mismatch_detail": "Specific mismatch text, e.g. 'Claimed: Senior Engineer — Record shows: Engineer II' or null if confirmed",
  "confidence": <0-100>,
  "notes": "Any additional context for the reviewer"
}}"""

    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-5.6-luna",
        max_completion_tokens=512,
        messages=[
            {"role": "system", "content": "You are an employment verification analyst. Be precise. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    result = json.loads(response.choices[0].message.content)

    verdict = result.get("verdict", "Unable to Verify")
    badge = "green" if verdict == "Confirmed" else ("red" if verdict == "Fabrication" else "yellow")

    return {
        "candidateName": name,
        "candidateId": candidate_id,
        "verdict": verdict,
        "badge": badge,
        "claimedTitle": result.get("claimed_title", position),
        "verifiedTitle": result.get("verified_title"),
        "claimedEmployer": result.get("claimed_employer"),
        "verifiedEmployer": result.get("verified_employer"),
        "mismatchDetail": result.get("mismatch_detail"),
        "confidence": result.get("confidence", 0),
        "notes": result.get("notes", ""),
    }


# ─── Doc Inspector ────────────────────────────────────────────────────────────

@router.post("/doc-inspector")
async def doc_inspector(file: UploadFile = File(...), doc_type: str = Form("pay_stub")):
    """Use GPT-4o Vision to inspect uploaded documents for authenticity signals."""
    content = await file.read()
    b64 = base64.b64encode(content).decode()
    mime = file.content_type or "image/png"

    doc_labels = {
        "pay_stub": "pay stub",
        "bank_statement": "bank statement",
        "offer_letter": "offer letter",
    }
    doc_label = doc_labels.get(doc_type, "document")

    client = get_openai_client()

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=800,
            messages=[
                {
                    "role": "system",
                    "content": "You are a document forensics analyst for a background screening company. Analyze documents for authenticity signals. Always respond with valid JSON.",
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Analyze this {doc_label} for authenticity. Look for:
- Font inconsistencies (mixed typefaces, irregular spacing)
- Alignment issues (misaligned fields, inconsistent margins)
- Metadata mismatches (dates that don't align, impossible sequences)
- Altered fields (blurring, pixelation, color bleeding around numbers)
- Layout anomalies (unusual formatting for this document type)

Respond in JSON:
{{
  "verdict": "Authentic|Review Required|Likely Altered",
  "confidence": <0-100>,
  "flags_found": ["specific flag 1", "specific flag 2"],
  "clean_signals": ["things that look authentic"],
  "summary": "2-3 sentence plain language summary of findings",
  "recommendation": "what the reviewer should do next"
}}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                    ],
                },
            ],
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
    except Exception as e:
        # Fallback if vision fails
        result = {
            "verdict": "Review Required",
            "confidence": 50,
            "flags_found": ["Document could not be fully analyzed — manual review recommended"],
            "clean_signals": [],
            "summary": f"Automated analysis encountered an issue: {str(e)[:100]}. Manual document review is recommended.",
            "recommendation": "Submit document for manual review by a compliance officer.",
        }

    verdict = result.get("verdict", "Review Required")
    badge = "green" if verdict == "Authentic" else ("red" if verdict == "Likely Altered" else "yellow")

    return {
        "docType": doc_type,
        "fileName": file.filename,
        "verdict": verdict,
        "badge": badge,
        "confidence": result.get("confidence", 0),
        "flagsFound": result.get("flags_found", []),
        "cleanSignals": result.get("clean_signals", []),
        "summary": result.get("summary", ""),
        "recommendation": result.get("recommendation", ""),
    }
