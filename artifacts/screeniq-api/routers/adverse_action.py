import json
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db
from ai_service import generate_adverse_action_notice

router = APIRouter(tags=["adverse-action"])


class AdverseActionInputData(BaseModel):
    screeningRunId: int
    reason: str | None = None


class AdverseActionUpdateData(BaseModel):
    stage: str | None = None


class NoticeInputData(BaseModel):
    noticeType: str


def row_to_aa(row) -> dict[str, Any]:
    return {
        "id": row[0],
        "candidateId": row[1],
        "screeningRunId": row[2],
        "stage": row[3],
        "reason": row[4],
        "preAdverseNoticeSentAt": row[5].isoformat() if row[5] else None,
        "waitingPeriodEndsAt": row[6].isoformat() if row[6] else None,
        "finalNoticeAt": row[7].isoformat() if row[7] else None,
        "closedAt": row[8].isoformat() if row[8] else None,
        "createdAt": row[9].isoformat() if row[9] else None,
    }


def row_to_notice(row) -> dict[str, Any]:
    return {
        "id": row[0],
        "adverseActionId": row[1],
        "noticeType": row[2],
        "content": row[3],
        "sentAt": row[4].isoformat() if row[4] else None,
        "createdAt": row[5].isoformat() if row[5] else None,
    }


@router.get("/candidates/{candidateId}/adverse-action")
def get_adverse_action(candidateId: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, candidate_id, screening_run_id, stage, reason,
                       pre_adverse_notice_sent_at, waiting_period_ends_at, final_notice_at, closed_at, created_at
                FROM adverse_actions WHERE candidate_id = %s ORDER BY id DESC LIMIT 1
            """, (candidateId,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No adverse action on file")
            return row_to_aa(row)


@router.post("/candidates/{candidateId}/adverse-action", status_code=201)
def create_adverse_action(candidateId: int, body: AdverseActionInputData):
    now = datetime.now(timezone.utc)
    waiting_period_ends = now + timedelta(days=5)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM candidates WHERE id = %s", (candidateId,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Candidate not found")

            cur.execute("""
                INSERT INTO adverse_actions (candidate_id, screening_run_id, stage, reason, pre_adverse_notice_sent_at, waiting_period_ends_at, created_at)
                VALUES (%s, %s, 'pre_adverse', %s, %s, %s, %s)
                RETURNING id, candidate_id, screening_run_id, stage, reason, pre_adverse_notice_sent_at, waiting_period_ends_at, final_notice_at, closed_at, created_at
            """, (candidateId, body.screeningRunId, body.reason, now, waiting_period_ends, now))
            row = cur.fetchone()

            # Update candidate status
            cur.execute("UPDATE candidates SET status = 'adverse_action', updated_at = %s WHERE id = %s", (now, candidateId))

            return row_to_aa(row)


@router.patch("/candidates/{candidateId}/adverse-action")
def update_adverse_action(candidateId: int, body: AdverseActionUpdateData):
    now = datetime.now(timezone.utc)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM adverse_actions WHERE candidate_id = %s ORDER BY id DESC LIMIT 1", (candidateId,))
            aa = cur.fetchone()
            if not aa:
                raise HTTPException(status_code=404, detail="No adverse action on file")
            aa_id = aa[0]

            updates = ["stage = %s"]
            values = [body.stage]

            if body.stage == "waiting_period":
                updates.append("waiting_period_ends_at = %s")
                values.append(now + timedelta(days=5))
            elif body.stage == "final_adverse":
                updates.append("final_notice_at = %s")
                values.append(now)
            elif body.stage == "closed":
                updates.append("closed_at = %s")
                values.append(now)

            values.append(aa_id)
            cur.execute(
                f"UPDATE adverse_actions SET {', '.join(updates)} WHERE id = %s "
                f"RETURNING id, candidate_id, screening_run_id, stage, reason, pre_adverse_notice_sent_at, waiting_period_ends_at, final_notice_at, closed_at, created_at",
                values
            )
            row = cur.fetchone()
            return row_to_aa(row)


@router.get("/candidates/{candidateId}/adverse-action/notices")
def list_notices(candidateId: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM adverse_actions WHERE candidate_id = %s ORDER BY id DESC LIMIT 1", (candidateId,))
            aa = cur.fetchone()
            if not aa:
                raise HTTPException(status_code=404, detail="No adverse action on file")

            cur.execute("""
                SELECT id, adverse_action_id, notice_type, content, sent_at, created_at
                FROM adverse_action_notices WHERE adverse_action_id = %s ORDER BY created_at
            """, (aa[0],))
            return [row_to_notice(r) for r in cur.fetchall()]


@router.post("/candidates/{candidateId}/adverse-action/notices", status_code=201)
def generate_notice(candidateId: int, body: NoticeInputData):
    now = datetime.now(timezone.utc)

    with get_db() as conn:
        with conn.cursor() as cur:
            # Get adverse action + candidate + risk assessment
            cur.execute("""
                SELECT aa.id, aa.screening_run_id, c.name, c.position, ra.key_findings
                FROM adverse_actions aa
                JOIN candidates c ON c.id = aa.candidate_id
                LEFT JOIN risk_assessments ra ON ra.screening_run_id = aa.screening_run_id
                WHERE aa.candidate_id = %s ORDER BY aa.id DESC LIMIT 1
            """, (candidateId,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No adverse action found")

            aa_id, run_id, candidate_name, position, key_findings = row
            findings = key_findings or "Background check revealed items requiring review."

            # Generate notice content via AI
            content = generate_adverse_action_notice(
                notice_type=body.noticeType,
                candidate_name=candidate_name,
                position=position,
                key_findings=findings,
            )

            cur.execute("""
                INSERT INTO adverse_action_notices (adverse_action_id, notice_type, content, sent_at, created_at)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, adverse_action_id, notice_type, content, sent_at, created_at
            """, (aa_id, body.noticeType, content, now, now))
            return row_to_notice(cur.fetchone())
