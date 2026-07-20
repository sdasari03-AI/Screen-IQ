"""
Continuous Monitoring — post-hire employee monitoring for new criminal records,
driving changes, sanctions, watchlist additions, and license status changes.
"""
import json
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


class EnrollRequest(BaseModel):
    monitorTypes: list[str] = ["criminal", "driving", "sanctions", "license"]


def row_to_enrollment(row) -> dict[str, Any]:
    return {
        "id": row[0],
        "candidateId": row[1],
        "candidateName": row[2],
        "position": row[3],
        "enrolledAt": row[4].isoformat() if row[4] else None,
        "status": row[5],
        "monitorTypes": row[6] if isinstance(row[6], list) else json.loads(row[6] or "[]"),
    }


def row_to_alert(row) -> dict[str, Any]:
    return {
        "id": row[0],
        "candidateId": row[1],
        "candidateName": row[2],
        "alertType": row[3],
        "severity": row[4],
        "description": row[5],
        "charge": row[6],
        "filedAt": row[7].isoformat() if row[7] else None,
        "status": row[8],
        "createdAt": row[9].isoformat() if row[9] else None,
    }


@router.get("/stats")
def get_monitoring_stats():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM monitoring_enrollments WHERE status = 'active'")
            total_enrolled = cur.fetchone()[0]

            now = datetime.now(timezone.utc)
            thirty_days_ago = now.replace(day=max(1, now.day - 30))
            cur.execute("""
                SELECT COUNT(*) FROM monitoring_alerts
                WHERE created_at >= NOW() - INTERVAL '30 days'
            """)
            alerts_30d = cur.fetchone()[0]

            cur.execute("""
                SELECT severity, COUNT(*) FROM monitoring_alerts
                WHERE status != 'dismissed'
                GROUP BY severity
            """)
            severity_counts = {r[0]: r[1] for r in cur.fetchall()}

            cur.execute("""
                SELECT COUNT(*) FROM monitoring_alerts WHERE status = 'open'
            """)
            open_alerts = cur.fetchone()[0]

    return {
        "totalEnrolled": total_enrolled,
        "alertsLast30Days": alerts_30d,
        "openAlerts": open_alerts,
        "severityBreakdown": {
            "critical": severity_counts.get("critical", 0),
            "warning": severity_counts.get("warning", 0),
            "info": severity_counts.get("info", 0),
        },
    }


@router.get("")
def list_enrollments():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT me.id, me.candidate_id, c.name, c.position, me.enrolled_at, me.status, me.monitor_types
                FROM monitoring_enrollments me
                JOIN candidates c ON c.id = me.candidate_id
                ORDER BY me.enrolled_at DESC
            """)
            return [row_to_enrollment(r) for r in cur.fetchall()]


@router.post("/enroll/{candidate_id}", status_code=201)
def enroll_candidate(candidate_id: int, body: EnrollRequest):
    now = datetime.now(timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM candidates WHERE id = %s", (candidate_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Candidate not found")

            cur.execute("""
                INSERT INTO monitoring_enrollments (candidate_id, enrolled_at, status, monitor_types)
                VALUES (%s, %s, 'active', %s)
                ON CONFLICT (candidate_id) DO UPDATE SET status = 'active', monitor_types = EXCLUDED.monitor_types
                RETURNING id
            """, (candidate_id, now, json.dumps(body.monitorTypes)))
            return {"id": cur.fetchone()[0], "candidateId": candidate_id, "status": "active"}


@router.get("/alerts")
def list_alerts():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ma.id, ma.candidate_id, c.name, ma.alert_type, ma.severity,
                       ma.description, ma.charge, ma.filed_at, ma.status, ma.created_at
                FROM monitoring_alerts ma
                JOIN candidates c ON c.id = ma.candidate_id
                ORDER BY ma.created_at DESC
            """)
            return [row_to_alert(r) for r in cur.fetchall()]


@router.post("/alerts/{alert_id}/dismiss", status_code=200)
def dismiss_alert(alert_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE monitoring_alerts SET status = 'dismissed' WHERE id = %s RETURNING id",
                (alert_id,)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "dismissed"}
