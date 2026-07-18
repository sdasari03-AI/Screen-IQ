from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats():
    today = datetime.now(timezone.utc).date()

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM candidates")
            total_candidates = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM candidates WHERE status IN ('pending', 'in_progress')")
            pending = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM screening_runs WHERE DATE(completed_at) = %s", (today,))
            completed_today = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM candidates WHERE status = 'flagged'")
            flagged = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM adverse_actions WHERE stage NOT IN ('closed')")
            aa_open = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM disputes WHERE status IN ('open', 'under_review')")
            open_disputes = cur.fetchone()[0]

            # Risk breakdown from risk assessments
            cur.execute("SELECT overall_risk, COUNT(*) FROM risk_assessments GROUP BY overall_risk")
            risk_breakdown = {"Low": 0, "Medium": 0, "High": 0}
            for row in cur.fetchall():
                risk_breakdown[row[0]] = row[1]

            # Check type status breakdown
            cur.execute("""
                SELECT check_type, status, COUNT(*)
                FROM check_results
                GROUP BY check_type, status
            """)
            check_type_breakdown: dict[str, dict[str, int]] = {}
            for row in cur.fetchall():
                ct = row[0]
                if ct not in check_type_breakdown:
                    check_type_breakdown[ct] = {}
                check_type_breakdown[ct][row[1]] = row[2]

            return {
                "totalCandidates": total_candidates,
                "pendingScreenings": pending,
                "completedToday": completed_today,
                "flaggedCandidates": flagged,
                "adverseActionsOpen": aa_open,
                "openDisputes": open_disputes,
                "riskBreakdown": risk_breakdown,
                "checkTypeBreakdown": check_type_breakdown,
            }


@router.get("/recent-activity")
def get_recent_activity():
    with get_db() as conn:
        with conn.cursor() as cur:
            activities = []

            # Recent completed screenings
            cur.execute("""
                SELECT sr.id, c.name, sr.completed_at
                FROM screening_runs sr
                JOIN candidates c ON c.id = sr.candidate_id
                WHERE sr.status = 'completed'
                ORDER BY sr.completed_at DESC LIMIT 5
            """)
            for row in cur.fetchall():
                activities.append({
                    "id": row[0],
                    "type": "screening_completed",
                    "candidateName": row[1],
                    "description": "Background screening completed",
                    "timestamp": row[2].isoformat() if row[2] else None,
                    "riskLevel": None,
                })

            # Recent risk assessments
            cur.execute("""
                SELECT ra.id, c.name, ra.overall_risk, ra.created_at
                FROM risk_assessments ra
                JOIN screening_runs sr ON sr.id = ra.screening_run_id
                JOIN candidates c ON c.id = sr.candidate_id
                ORDER BY ra.created_at DESC LIMIT 5
            """)
            for row in cur.fetchall():
                activities.append({
                    "id": row[0] + 1000,
                    "type": "risk_assessed",
                    "candidateName": row[1],
                    "description": f"AI risk assessment: {row[2]} risk",
                    "timestamp": row[3].isoformat() if row[3] else None,
                    "riskLevel": row[2],
                })

            # Recent adverse actions
            cur.execute("""
                SELECT aa.id, c.name, aa.created_at
                FROM adverse_actions aa
                JOIN candidates c ON c.id = aa.candidate_id
                ORDER BY aa.created_at DESC LIMIT 3
            """)
            for row in cur.fetchall():
                activities.append({
                    "id": row[0] + 2000,
                    "type": "adverse_action_initiated",
                    "candidateName": row[1],
                    "description": "Adverse action workflow initiated",
                    "timestamp": row[2].isoformat() if row[2] else None,
                    "riskLevel": "High",
                })

            # Recent disputes
            cur.execute("""
                SELECT d.id, c.name, d.created_at
                FROM disputes d
                JOIN candidates c ON c.id = d.candidate_id
                ORDER BY d.created_at DESC LIMIT 3
            """)
            for row in cur.fetchall():
                activities.append({
                    "id": row[0] + 3000,
                    "type": "dispute_filed",
                    "candidateName": row[1],
                    "description": "Candidate filed a dispute",
                    "timestamp": row[2].isoformat() if row[2] else None,
                    "riskLevel": None,
                })

            # Sort by timestamp
            activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
            return activities[:15]
