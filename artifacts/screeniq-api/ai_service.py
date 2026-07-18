"""
OpenAI-powered risk assessment, compliance insight, adverse action notices,
and WBR report generation.
Uses Replit AI Integrations for OpenAI access.
"""
import os
import json
from typing import Any
from datetime import datetime, timezone
from openai import OpenAI

_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        base_url = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")
        api_key = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY", "dummy")
        if base_url:
            _client = OpenAI(base_url=base_url, api_key=api_key)
        else:
            _client = OpenAI()
    return _client


def generate_risk_assessment(
    candidate_name: str,
    position: str,
    checks: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Use GPT to generate a grounded risk assessment from check results.
    The model is strictly constrained to use only the provided check data.
    """
    checks_summary = "\n".join([
        f"- {c['check_type'].upper()} ({c['data_source']}): {c['status_label']} "
        f"[Confidence: {int(c['confidence_score'] * 100)}%, Processing: {c['processing_time_ms']}ms]"
        + (f"\n  Details: {json.dumps(c['details'])}" if c['details'] else "")
        for c in checks
    ])

    prompt = f"""You are a compliance officer reviewing background check results for a candidate.
Candidate: {candidate_name}
Position applied for: {position}

Background Check Results:
{checks_summary}

Based ONLY on the check results above (do not invent or assume any information not present), provide:

1. Overall Risk Rating: MUST be exactly one of: Low, Medium, High
2. Key Findings: A concise 2-3 sentence summary of what the checks revealed
3. Recommended Next Steps: 2-4 actionable recommendations
4. FCRA Adverse Action Flag: Whether any findings legally require FCRA adverse action consideration (true/false)
5. Risk Factors: List of specific factors that influenced the rating

Respond in JSON format:
{{
  "overall_risk": "Low|Medium|High",
  "key_findings": "...",
  "recommended_steps": "...",
  "fcra_adverse_flag": true|false,
  "risk_factors": ["factor1", "factor2"]
}}

IMPORTANT: Base your assessment ONLY on the data provided. Do not hallucinate records or findings not in the data above."""

    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-5.6-luna",
        max_completion_tokens=1024,
        messages=[
            {"role": "system", "content": "You are a background screening compliance expert. You provide precise, factual assessments based only on provided data. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    return {
        "overall_risk": result.get("overall_risk", "Medium"),
        "key_findings": result.get("key_findings", ""),
        "recommended_steps": result.get("recommended_steps", ""),
        "fcra_adverse_flag": bool(result.get("fcra_adverse_flag", False)),
        "risk_factors": result.get("risk_factors", []),
    }


def generate_compliance_insight(metrics: dict[str, Any]) -> dict[str, Any]:
    """Generate AI-powered compliance insights from aggregated metrics."""
    industry_avg = {
        "criminal": 1200,
        "employment": 1800,
        "education": 900,
        "driving": 600,
        "drug_health": 4200,
        "credit": 1100,
        "eviction": 900,
    }

    prompt = f"""You are a compliance analytics expert reviewing background screening metrics.

Current Metrics:
- Total screenings: {metrics.get('totalScreenings', 0)}
- Dispute rate: {metrics.get('disputeRate', 0):.1%}
- Adverse action rate: {metrics.get('adverseActionRate', 0):.1%}
- Average turnaround times (ms): {json.dumps(metrics.get('avgTurnaroundByType', {}))}
- Industry average turnaround (ms): {json.dumps(industry_avg)}
- Source reliability scores: {json.dumps(metrics.get('sourceReliability', {}))}

Provide a concise, specific compliance insight (2-3 sentences) identifying the most significant trend or issue,
citing specific numbers from the data. Also provide 3 concrete recommendations.

Respond in JSON:
{{
  "insight": "...",
  "recommendations": ["rec1", "rec2", "rec3"]
}}"""

    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-5.6-luna",
        max_completion_tokens=512,
        messages=[
            {"role": "system", "content": "You are a compliance analytics expert. Be specific and cite numbers from the data."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    return {
        "insight": result.get("insight", ""),
        "recommendations": result.get("recommendations", []),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def generate_adverse_action_notice(
    notice_type: str,
    candidate_name: str,
    position: str,
    key_findings: str,
    company_name: str = "ScreenIQ Corp",
) -> str:
    """Generate a FCRA-compliant adverse action notice."""
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")

    if notice_type == "pre_adverse":
        prompt = f"""Generate a FCRA-compliant pre-adverse action notice letter.

Candidate: {candidate_name}
Position: {position}
Company: {company_name}
Date: {today}
Key findings from background check: {key_findings}

The letter must include:
1. Statement that a consumer report was obtained
2. Name, address, and phone of the consumer reporting agency (use "ScreenIQ Data Services, 100 Compliance Blvd, Austin TX 78701, (512) 555-0100")
3. Statement of the candidate's right to dispute
4. The 5-business-day review period
5. Professional closing

Format as a formal business letter."""
    else:
        prompt = f"""Generate a FCRA-compliant final adverse action notice letter.

Candidate: {candidate_name}
Position: {position}
Company: {company_name}
Date: {today}
Key findings from background check: {key_findings}

The letter must include:
1. Statement that adverse action is being taken based in whole or part on information from a consumer report
2. Name, address, and phone of the consumer reporting agency
3. Statement that the CRA did not make the adverse decision
4. The candidate's right to a free copy of the report within 60 days
5. The right to dispute the accuracy of the report
6. Professional closing

Format as a formal business letter."""

    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-5.6-luna",
        max_completion_tokens=1024,
        messages=[
            {"role": "system", "content": "You are a legal compliance expert specializing in FCRA-compliant employment screening notices."},
            {"role": "user", "content": prompt},
        ],
    )

    return response.choices[0].message.content or ""


def generate_wbr_report(metrics: dict[str, Any]) -> dict[str, Any]:
    """
    Generate an AI-powered Weekly Business Review (WBR) report.
    RealPage-style executive narrative with metrics, risks, and recommendations.
    """
    wow_change = metrics["screenings_this_week"] - metrics["screenings_last_week"]
    wow_pct = (wow_change / metrics["screenings_last_week"] * 100) if metrics["screenings_last_week"] > 0 else 0

    prompt = f"""You are a Director of Operations at a background screening platform presenting the weekly business review (WBR).

Week: {metrics['week_start']} to {metrics['week_end']}

Key Metrics This Week:
- New screenings initiated: {metrics['screenings_this_week']} (vs {metrics['screenings_last_week']} last week, {wow_pct:+.1f}% WoW)
- Screenings completed: {metrics['completed_this_week']}
- New candidates added: {metrics['new_candidates']}
- New disputes filed: {metrics['new_disputes']}
- New adverse actions initiated: {metrics['new_adverse_actions']}
- Current pending backlog: {metrics['pending_backlog']} screenings
- Flagged candidates awaiting review: {metrics['flagged_candidates']}
- Avg turnaround time: {metrics['avg_turnaround_ms']}ms
- Check type breakdown this week: {json.dumps(metrics['check_type_breakdown'])}
- Platform totals: {metrics['total_candidates']} total candidates, {metrics['total_screenings']} total screenings

Generate a professional WBR executive narrative. Be specific, cite numbers, and flag anything that needs attention.

Respond in JSON:
{{
  "summary": "2-3 sentence exec summary of the week",
  "content": "Full WBR narrative (4-6 paragraphs, markdown formatted, covering: week highlights, volume trends, quality metrics, backlog/operational health, and outlook)",
  "key_metrics": {{
    "screenings_wow_pct": <number>,
    "completion_rate": <0-1 number>,
    "backlog_health": "healthy|watch|critical",
    "dispute_trend": "improving|stable|worsening"
  }},
  "risks": ["risk1", "risk2"],
  "recommendations": ["action1", "action2", "action3"]
}}"""

    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-5.6-luna",
        max_completion_tokens=1500,
        messages=[
            {"role": "system", "content": "You are an operations director at a background screening company. Write crisp, data-driven executive narratives. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    return {
        "summary": result.get("summary", ""),
        "content": result.get("content", ""),
        "key_metrics": result.get("key_metrics", {}),
        "risks": result.get("risks", []),
        "recommendations": result.get("recommendations", []),
    }
