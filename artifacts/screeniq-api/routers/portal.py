import json
from typing import Any

from fastapi import APIRouter, HTTPException

from database import get_db

router = APIRouter(prefix="/portal", tags=["portal"])


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


@router.get("/{portalToken}")
def get_candidate_portal(portalToken: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            # Get candidate by portal token
            cur.execute("""
                SELECT c.id, c.name, c.date_of_birth, c.ssn_last_four, c.position, c.email, c.phone,
                       c.status, c.portal_token,
                       (SELECT id FROM screening_runs WHERE candidate_id = c.id ORDER BY id DESC LIMIT 1),
                       c.created_at, c.updated_at
                FROM candidates c WHERE c.portal_token = %s
            """, (portalToken,))
            cand_row = cur.fetchone()
            if not cand_row:
                raise HTTPException(status_code=404, detail="Invalid portal token")

            candidate = {
                "id": cand_row[0],
                "name": cand_row[1],
                "dateOfBirth": cand_row[2],
                "ssnLastFour": cand_row[3],
                "position": cand_row[4],
                "email": cand_row[5],
                "phone": cand_row[6],
                "status": cand_row[7],
                "portalToken": cand_row[8],
                "latestRunId": cand_row[9],
                "createdAt": cand_row[10].isoformat() if cand_row[10] else None,
                "updatedAt": cand_row[11].isoformat() if cand_row[11] else None,
            }
            candidate_id = candidate["id"]

            # Get latest screening run
            latest_run = None
            check_results = []
            if candidate["latestRunId"]:
                run_id = candidate["latestRunId"]
                cur.execute("""
                    SELECT id, candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at
                    FROM screening_runs WHERE id = %s
                """, (run_id,))
                run_row = cur.fetchone()
                if run_row:
                    latest_run = {
                        "id": run_row[0],
                        "candidateId": run_row[1],
                        "status": run_row[2],
                        "checksTotal": run_row[3],
                        "checksCompleted": run_row[4],
                        "startedAt": run_row[5].isoformat() if run_row[5] else None,
                        "completedAt": run_row[6].isoformat() if run_row[6] else None,
                        "createdAt": run_row[7].isoformat() if run_row[7] else None,
                    }

                    cur.execute("""
                        SELECT id, screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at
                        FROM check_results WHERE screening_run_id = %s ORDER BY id
                    """, (run_id,))
                    check_results = [row_to_check(r) for r in cur.fetchall()]

            # Get disputes
            cur.execute("""
                SELECT id, candidate_id, check_result_id, reason, status, resolution, supporting_doc_url, created_at, updated_at
                FROM disputes WHERE candidate_id = %s ORDER BY created_at DESC
            """, (candidate_id,))
            disputes = []
            for r in cur.fetchall():
                disputes.append({
                    "id": r[0], "candidateId": r[1], "checkResultId": r[2],
                    "reason": r[3], "status": r[4], "resolution": r[5],
                    "supportingDocUrl": r[6],
                    "createdAt": r[7].isoformat() if r[7] else None,
                    "updatedAt": r[8].isoformat() if r[8] else None,
                })

            # Get adverse action
            cur.execute("""
                SELECT id, candidate_id, screening_run_id, stage, reason, pre_adverse_notice_sent_at, waiting_period_ends_at, final_notice_at, closed_at, created_at
                FROM adverse_actions WHERE candidate_id = %s ORDER BY id DESC LIMIT 1
            """, (candidate_id,))
            aa_row = cur.fetchone()
            adverse_action = None
            if aa_row:
                adverse_action = {
                    "id": aa_row[0], "candidateId": aa_row[1], "screeningRunId": aa_row[2],
                    "stage": aa_row[3], "reason": aa_row[4],
                    "preAdverseNoticeSentAt": aa_row[5].isoformat() if aa_row[5] else None,
                    "waitingPeriodEndsAt": aa_row[6].isoformat() if aa_row[6] else None,
                    "finalNoticeAt": aa_row[7].isoformat() if aa_row[7] else None,
                    "closedAt": aa_row[8].isoformat() if aa_row[8] else None,
                    "createdAt": aa_row[9].isoformat() if aa_row[9] else None,
                }

            return {
                "candidate": candidate,
                "latestRun": latest_run,
                "checkResults": check_results,
                "disputes": disputes,
                "adverseAction": adverse_action,
            }
