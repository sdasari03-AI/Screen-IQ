import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter(prefix="/candidates", tags=["candidates"])


class CandidateInput(BaseModel):
    name: str
    dateOfBirth: str | None = None
    ssnLastFour: str | None = None
    position: str
    email: str | None = None
    phone: str | None = None
    screeningType: str = "employment"


class CandidateUpdate(BaseModel):
    name: str | None = None
    dateOfBirth: str | None = None
    ssnLastFour: str | None = None
    position: str | None = None
    email: str | None = None
    phone: str | None = None
    status: str | None = None
    screeningType: str | None = None


def row_to_candidate(row) -> dict[str, Any]:
    return {
        "id": row[0],
        "name": row[1],
        "dateOfBirth": row[2],
        "ssnLastFour": row[3],
        "position": row[4],
        "email": row[5],
        "phone": row[6],
        "status": row[7],
        "portalToken": row[8],
        "latestRunId": row[9],
        "createdAt": row[10].isoformat() if row[10] else None,
        "updatedAt": row[11].isoformat() if row[11] else None,
        "screeningType": row[12] if len(row) > 12 else "employment",
    }


@router.get("")
def list_candidates(status: str | None = None, search: str | None = None, screeningType: str | None = None):
    with get_db() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT c.id, c.name, c.date_of_birth, c.ssn_last_four, c.position, c.email, c.phone,
                       c.status, c.portal_token,
                       (SELECT id FROM screening_runs WHERE candidate_id = c.id ORDER BY id DESC LIMIT 1) as latest_run_id,
                       c.created_at, c.updated_at,
                       COALESCE(c.screening_type, 'employment') as screening_type
                FROM candidates c
                WHERE 1=1
            """
            params: list = []
            if status:
                query += " AND c.status = %s"
                params.append(status)
            if search:
                query += " AND (c.name ILIKE %s OR c.position ILIKE %s)"
                params.extend([f"%{search}%", f"%{search}%"])
            if screeningType:
                query += " AND COALESCE(c.screening_type, 'employment') = %s"
                params.append(screeningType)
            query += " ORDER BY c.created_at DESC"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [row_to_candidate(r) for r in rows]


@router.post("", status_code=201)
def create_candidate(body: CandidateInput):
    now = datetime.now(timezone.utc)
    portal_token = secrets.token_urlsafe(24)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO candidates (name, date_of_birth, ssn_last_four, position, email, phone, status, portal_token, screening_type, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s, %s, %s, %s)
                RETURNING id, name, date_of_birth, ssn_last_four, position, email, phone, status, portal_token, NULL, created_at, updated_at, screening_type
            """, (body.name, body.dateOfBirth, body.ssnLastFour, body.position, body.email, body.phone, portal_token, body.screeningType, now, now))
            row = cur.fetchone()
            return row_to_candidate(row)


@router.get("/{id}")
def get_candidate(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.name, c.date_of_birth, c.ssn_last_four, c.position, c.email, c.phone,
                       c.status, c.portal_token,
                       (SELECT id FROM screening_runs WHERE candidate_id = c.id ORDER BY id DESC LIMIT 1),
                       c.created_at, c.updated_at,
                       COALESCE(c.screening_type, 'employment') as screening_type
                FROM candidates c WHERE c.id = %s
            """, (id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Candidate not found")
            return row_to_candidate(row)


@router.patch("/{id}")
def update_candidate(id: int, body: CandidateUpdate):
    updates = []
    values = []
    if body.name is not None:
        updates.append("name = %s")
        values.append(body.name)
    if body.dateOfBirth is not None:
        updates.append("date_of_birth = %s")
        values.append(body.dateOfBirth)
    if body.ssnLastFour is not None:
        updates.append("ssn_last_four = %s")
        values.append(body.ssnLastFour)
    if body.position is not None:
        updates.append("position = %s")
        values.append(body.position)
    if body.email is not None:
        updates.append("email = %s")
        values.append(body.email)
    if body.phone is not None:
        updates.append("phone = %s")
        values.append(body.phone)
    if body.status is not None:
        updates.append("status = %s")
        values.append(body.status)
    if body.screeningType is not None:
        updates.append("screening_type = %s")
        values.append(body.screeningType)
    updates.append("updated_at = %s")
    values.append(datetime.now(timezone.utc))
    values.append(id)

    with get_db() as conn:
        with conn.cursor() as cur:
            if updates:
                cur.execute(
                    f"UPDATE candidates SET {', '.join(updates)} WHERE id = %s RETURNING id",
                    values
                )
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Candidate not found")
            cur.execute("""
                SELECT c.id, c.name, c.date_of_birth, c.ssn_last_four, c.position, c.email, c.phone,
                       c.status, c.portal_token,
                       (SELECT id FROM screening_runs WHERE candidate_id = c.id ORDER BY id DESC LIMIT 1),
                       c.created_at, c.updated_at,
                       COALESCE(c.screening_type, 'employment') as screening_type
                FROM candidates c WHERE c.id = %s
            """, (id,))
            row = cur.fetchone()
            return row_to_candidate(row)


@router.delete("/{id}", status_code=204)
def delete_candidate(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM candidates WHERE id = %s RETURNING id", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Candidate not found")
