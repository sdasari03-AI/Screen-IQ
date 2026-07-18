"""
Reports router — AI-generated Weekly Business Review (WBR) report.
RealPage-style executive narrative with metrics, risks, and recommendations.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException

from database import get_db
from ai_service import generate_wbr_report

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_week_metrics(conn) -> dict:
    """Pull all metrics needed for a WBR report."""
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)

    with conn.cursor() as cur:
        # This week vs last week
        cur.execute("SELECT COUNT(*) FROM screening_runs WHERE created_at >= %s", (week_start,))
        screenings_this_week = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM screening_runs WHERE created_at < %s AND created_at >= %s",
                    (week_start, week_start - timedelta(days=7)))
        screenings_last_week = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM screening_runs WHERE status = 'completed' AND completed_at >= %s", (week_start,))
        completed_this_week = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM candidates WHERE created_at >= %s", (week_start,))
        new_candidates = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM disputes WHERE created_at >= %s", (week_start,))
        new_disputes = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM adverse_actions WHERE created_at >= %s", (week_start,))
        new_adverse = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM screening_runs WHERE status IN ('pending','running')")
        pending_backlog = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM candidates WHERE status = 'flagged'")
        flagged_candidates = cur.fetchone()[0]

        cur.execute("""
            SELECT AVG(processing_time_ms)::float FROM check_results
            WHERE created_at >= %s
        """, (week_start,))
        avg_turnaround_raw = cur.fetchone()[0]
        avg_turnaround_ms = round(avg_turnaround_raw) if avg_turnaround_raw else 1400

        cur.execute("""
            SELECT check_type, COUNT(*) FROM check_results
            WHERE created_at >= %s GROUP BY check_type
        """, (week_start,))
        check_type_breakdown = {r[0]: r[1] for r in cur.fetchall()}

        cur.execute("SELECT COUNT(*) FROM candidates")
        total_candidates = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM screening_runs")
        total_screenings = cur.fetchone()[0]

    return {
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": now.strftime("%Y-%m-%d"),
        "screenings_this_week": screenings_this_week,
        "screenings_last_week": screenings_last_week,
        "completed_this_week": completed_this_week,
        "new_candidates": new_candidates,
        "new_disputes": new_disputes,
        "new_adverse_actions": new_adverse,
        "pending_backlog": pending_backlog,
        "flagged_candidates": flagged_candidates,
        "avg_turnaround_ms": avg_turnaround_ms,
        "check_type_breakdown": check_type_breakdown,
        "total_candidates": total_candidates,
        "total_screenings": total_screenings,
    }


@router.get("/wbr")
def get_wbr_report():
    """Get the latest WBR report, or generate one if none exists."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, week_start, week_end, content, summary, key_metrics, risks, recommendations, created_at
                FROM wbr_reports ORDER BY created_at DESC LIMIT 1
            """)
            row = cur.fetchone()

        if row:
            import json
            return {
                "id": row[0],
                "weekStart": row[1],
                "weekEnd": row[2],
                "content": row[3],
                "summary": row[4],
                "keyMetrics": row[5] if isinstance(row[5], dict) else json.loads(row[5] or "{}"),
                "risks": row[6] if isinstance(row[6], list) else json.loads(row[6] or "[]"),
                "recommendations": row[7] if isinstance(row[7], list) else json.loads(row[7] or "[]"),
                "generatedAt": row[8].isoformat() if row[8] else None,
            }

        # No report exists — generate one
        return _generate_and_store(conn)


@router.post("/wbr/generate")
def generate_wbr():
    """Force-generate a fresh WBR report."""
    with get_db() as conn:
        return _generate_and_store(conn)


def _generate_and_store(conn) -> dict:
    metrics = _get_week_metrics(conn)
    report = generate_wbr_report(metrics)
    import json

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO wbr_reports (week_start, week_end, content, summary, key_metrics, risks, recommendations, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            metrics["week_start"],
            metrics["week_end"],
            report["content"],
            report["summary"],
            json.dumps(report["key_metrics"]),
            json.dumps(report["risks"]),
            json.dumps(report["recommendations"]),
            datetime.now(timezone.utc),
        ))
        row = cur.fetchone()

    return {
        "id": row[0],
        "weekStart": metrics["week_start"],
        "weekEnd": metrics["week_end"],
        "content": report["content"],
        "summary": report["summary"],
        "keyMetrics": report["key_metrics"],
        "risks": report["risks"],
        "recommendations": report["recommendations"],
        "generatedAt": row[1].isoformat() if row[1] else None,
    }
