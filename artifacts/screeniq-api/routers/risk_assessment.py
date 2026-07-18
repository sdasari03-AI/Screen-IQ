import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from database import get_db
from ai_service import generate_risk_assessment

router = APIRouter(tags=["risk"])


def row_to_assessment(row) -> dict[str, Any]:
    return {
        "id": row[0],
        "screeningRunId": row[1],
        "overallRisk": row[2],
        "keyFindings": row[3],
        "recommendedSteps": row[4],
        "fcraAdverseFlag": row[5],
        "riskFactors": row[6] if isinstance(row[6], list) else json.loads(row[6] or "[]"),
        "createdAt": row[7].isoformat() if row[7] else None,
    }


@router.get("/candidates/{candidateId}/screening-runs/{runId}/risk-assessment")
def get_risk_assessment(candidateId: int, runId: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM screening_runs WHERE id = %s AND candidate_id = %s", (runId, candidateId))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Screening run not found")

            cur.execute("""
                SELECT id, screening_run_id, overall_risk, key_findings, recommended_steps, fcra_adverse_flag, risk_factors, created_at
                FROM risk_assessments WHERE screening_run_id = %s
            """, (runId,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Risk assessment not yet generated")
            return row_to_assessment(row)


@router.post("/candidates/{candidateId}/screening-runs/{runId}/risk-assessment", status_code=201)
def create_risk_assessment(candidateId: int, runId: int):
    now = datetime.now(timezone.utc)

    with get_db() as conn:
        with conn.cursor() as cur:
            # Verify run belongs to candidate and is complete
            cur.execute("""
                SELECT sr.id, c.name, c.position
                FROM screening_runs sr
                JOIN candidates c ON c.id = sr.candidate_id
                WHERE sr.id = %s AND sr.candidate_id = %s AND sr.status = 'completed'
            """, (runId, candidateId))
            run = cur.fetchone()
            if not run:
                raise HTTPException(status_code=404, detail="Completed screening run not found")

            _, candidate_name, position = run

            # Get check results
            cur.execute("""
                SELECT check_type, status, status_label, data_source, confidence_score, processing_time_ms, details
                FROM check_results WHERE screening_run_id = %s ORDER BY id
            """, (runId,))
            checks = []
            for r in cur.fetchall():
                checks.append({
                    "check_type": r[0],
                    "status": r[1],
                    "status_label": r[2],
                    "data_source": r[3],
                    "confidence_score": float(r[4]),
                    "processing_time_ms": r[5],
                    "details": r[6] if isinstance(r[6], dict) else json.loads(r[6] or "{}"),
                })

            if not checks:
                raise HTTPException(status_code=400, detail="No check results found for this run")

            # Generate AI assessment
            assessment = generate_risk_assessment(candidate_name, position, checks)

            # Check if already exists (upsert)
            cur.execute("SELECT id FROM risk_assessments WHERE screening_run_id = %s", (runId,))
            existing = cur.fetchone()

            if existing:
                cur.execute("""
                    UPDATE risk_assessments
                    SET overall_risk=%s, key_findings=%s, recommended_steps=%s, fcra_adverse_flag=%s, risk_factors=%s, created_at=%s
                    WHERE screening_run_id=%s
                    RETURNING id, screening_run_id, overall_risk, key_findings, recommended_steps, fcra_adverse_flag, risk_factors, created_at
                """, (
                    assessment["overall_risk"], assessment["key_findings"], assessment["recommended_steps"],
                    assessment["fcra_adverse_flag"], json.dumps(assessment["risk_factors"]), now, runId
                ))
            else:
                cur.execute("""
                    INSERT INTO risk_assessments (screening_run_id, overall_risk, key_findings, recommended_steps, fcra_adverse_flag, risk_factors, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, screening_run_id, overall_risk, key_findings, recommended_steps, fcra_adverse_flag, risk_factors, created_at
                """, (
                    runId, assessment["overall_risk"], assessment["key_findings"], assessment["recommended_steps"],
                    assessment["fcra_adverse_flag"], json.dumps(assessment["risk_factors"]), now
                ))

            row = cur.fetchone()
            return row_to_assessment(row)
