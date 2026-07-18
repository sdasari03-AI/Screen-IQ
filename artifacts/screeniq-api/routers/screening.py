import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db
from simulation import simulate_all_checks

router = APIRouter(tags=["screening"])


class ScreeningInputData(BaseModel):
    checkTypes: list[str] | None = None


def row_to_run(row, checks=None) -> dict[str, Any]:
    result = {
        "id": row[0],
        "candidateId": row[1],
        "status": row[2],
        "checksTotal": row[3],
        "checksCompleted": row[4],
        "startedAt": row[5].isoformat() if row[5] else None,
        "completedAt": row[6].isoformat() if row[6] else None,
        "createdAt": row[7].isoformat() if row[7] else None,
    }
    if checks is not None:
        result["checks"] = checks
    return result


def row_to_check(row) -> dict[str, Any]:
    return {
        "id": row[0],
        "screeningRunId": row[1],
        "checkType": row[2],
        "status": row[3],
        "statusLabel": row[4],
        "dataSource": row[5],
        "confidenceScore": float(row[6]),
        "processingTimeMs": row[7],
        "details": row[8] if isinstance(row[8], dict) else json.loads(row[8] or "{}"),
        "createdAt": row[9].isoformat() if row[9] else None,
    }


@router.post("/candidates/{candidateId}/run-screening", status_code=201)
def run_screening(candidateId: int, body: ScreeningInputData):
    now = datetime.now(timezone.utc)

    with get_db() as conn:
        with conn.cursor() as cur:
            # Verify candidate exists and get name
            cur.execute("SELECT name FROM candidates WHERE id = %s", (candidateId,))
            candidate = cur.fetchone()
            if not candidate:
                raise HTTPException(status_code=404, detail="Candidate not found")
            candidate_name = candidate[0]

            check_types = body.checkTypes or ["criminal", "employment", "education", "driving"]
            checks = simulate_all_checks(candidate_name, check_types)

            # Create screening run
            cur.execute("""
                INSERT INTO screening_runs (candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at)
                VALUES (%s, 'completed', %s, %s, %s, %s, %s)
                RETURNING id, candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at
            """, (candidateId, len(checks), len(checks), now, now, now))
            run_row = cur.fetchone()
            run_id = run_row[0]

            # Insert check results
            inserted_checks = []
            for check in checks:
                cur.execute("""
                    INSERT INTO check_results (screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at
                """, (
                    run_id, check["check_type"], check["status"], check["status_label"],
                    check["data_source"], check["confidence_score"], check["processing_time_ms"],
                    json.dumps(check["details"]), now
                ))
                inserted_checks.append(row_to_check(cur.fetchone()))

            # Update candidate status
            has_flag = any(c["status"] in ("flag", "discrepancy", "suspended", "violations") for c in checks)
            new_status = "flagged" if has_flag else "completed"
            cur.execute("UPDATE candidates SET status = %s, updated_at = %s WHERE id = %s", (new_status, now, candidateId))

            return row_to_run(run_row, checks=inserted_checks)


@router.get("/candidates/{candidateId}/screening-runs")
def list_screening_runs(candidateId: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM candidates WHERE id = %s", (candidateId,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Candidate not found")

            cur.execute("""
                SELECT id, candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at
                FROM screening_runs WHERE candidate_id = %s ORDER BY created_at DESC
            """, (candidateId,))
            rows = cur.fetchall()
            return [row_to_run(r) for r in rows]


@router.get("/candidates/{candidateId}/screening-runs/{runId}")
def get_screening_run(candidateId: int, runId: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at
                FROM screening_runs WHERE id = %s AND candidate_id = %s
            """, (runId, candidateId))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Screening run not found")

            cur.execute("""
                SELECT id, screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at
                FROM check_results WHERE screening_run_id = %s ORDER BY id
            """, (runId,))
            checks = [row_to_check(r) for r in cur.fetchall()]

            return row_to_run(row, checks=checks)


@router.get("/candidates/{candidateId}/screening-runs/{runId}/checks")
def list_check_results(candidateId: int, runId: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM screening_runs WHERE id = %s AND candidate_id = %s", (runId, candidateId))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Screening run not found")

            cur.execute("""
                SELECT id, screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at
                FROM check_results WHERE screening_run_id = %s ORDER BY id
            """, (runId,))
            return [row_to_check(r) for r in cur.fetchall()]
