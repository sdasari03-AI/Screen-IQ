from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter(tags=["disputes"])


class DisputeInputData(BaseModel):
    checkResultId: int
    reason: str
    supportingDocUrl: str | None = None


class DisputeUpdateData(BaseModel):
    status: str | None = None
    resolution: str | None = None


def row_to_dispute(row) -> dict[str, Any]:
    return {
        "id": row[0],
        "candidateId": row[1],
        "checkResultId": row[2],
        "reason": row[3],
        "status": row[4],
        "resolution": row[5],
        "supportingDocUrl": row[6],
        "createdAt": row[7].isoformat() if row[7] else None,
        "updatedAt": row[8].isoformat() if row[8] else None,
    }


@router.get("/candidates/{candidateId}/disputes")
def list_candidate_disputes(candidateId: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM candidates WHERE id = %s", (candidateId,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Candidate not found")
            cur.execute("""
                SELECT id, candidate_id, check_result_id, reason, status, resolution, supporting_doc_url, created_at, updated_at
                FROM disputes WHERE candidate_id = %s ORDER BY created_at DESC
            """, (candidateId,))
            return [row_to_dispute(r) for r in cur.fetchall()]


@router.post("/candidates/{candidateId}/disputes", status_code=201)
def create_dispute(candidateId: int, body: DisputeInputData):
    now = datetime.now(timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM candidates WHERE id = %s", (candidateId,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Candidate not found")
            cur.execute("""
                INSERT INTO disputes (candidate_id, check_result_id, reason, status, supporting_doc_url, created_at, updated_at)
                VALUES (%s, %s, %s, 'open', %s, %s, %s)
                RETURNING id, candidate_id, check_result_id, reason, status, resolution, supporting_doc_url, created_at, updated_at
            """, (candidateId, body.checkResultId, body.reason, body.supportingDocUrl, now, now))
            return row_to_dispute(cur.fetchone())


@router.get("/disputes/{id}")
def get_dispute(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, candidate_id, check_result_id, reason, status, resolution, supporting_doc_url, created_at, updated_at
                FROM disputes WHERE id = %s
            """, (id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Dispute not found")
            return row_to_dispute(row)


@router.patch("/disputes/{id}")
def update_dispute(id: int, body: DisputeUpdateData):
    now = datetime.now(timezone.utc)
    updates = ["updated_at = %s"]
    values = [now]
    if body.status is not None:
        updates.append("status = %s")
        values.append(body.status)
    if body.resolution is not None:
        updates.append("resolution = %s")
        values.append(body.resolution)
    values.append(id)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE disputes SET {', '.join(updates)} WHERE id = %s "
                f"RETURNING id, candidate_id, check_result_id, reason, status, resolution, supporting_doc_url, created_at, updated_at",
                values
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Dispute not found")
            return row_to_dispute(row)
