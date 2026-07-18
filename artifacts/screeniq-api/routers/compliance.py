from datetime import datetime, timezone, timedelta
from typing import Any
import random

from fastapi import APIRouter

from database import get_db
from ai_service import generate_compliance_insight

router = APIRouter(prefix="/compliance", tags=["compliance"])

INDUSTRY_AVG_TURNAROUND = {
    "criminal": 1200,
    "employment": 1800,
    "education": 900,
    "driving": 600,
}


@router.get("/metrics")
def get_compliance_metrics():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM candidates")
            total_candidates = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM screening_runs")
            total_screenings = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM disputes")
            total_disputes = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM adverse_actions")
            total_adverse = cur.fetchone()[0]

            # Average turnaround by check type
            cur.execute("""
                SELECT check_type, AVG(processing_time_ms)::float
                FROM check_results
                GROUP BY check_type
            """)
            avg_turnaround = {}
            for row in cur.fetchall():
                avg_turnaround[row[0]] = round(row[1]) if row[1] else INDUSTRY_AVG_TURNAROUND.get(row[0], 1000)

            # Fill missing types with industry avg
            for ct in ["criminal", "employment", "education", "driving"]:
                if ct not in avg_turnaround:
                    avg_turnaround[ct] = INDUSTRY_AVG_TURNAROUND[ct]

            # Source reliability (confidence score avg)
            cur.execute("""
                SELECT data_source, AVG(confidence_score)::float
                FROM check_results
                GROUP BY data_source
            """)
            source_reliability = {}
            for row in cur.fetchall():
                source_reliability[row[0]] = round(row[1], 3) if row[1] else 0.85

            dispute_rate = (total_disputes / total_screenings) if total_screenings > 0 else 0.0
            adverse_rate = (total_adverse / total_candidates) if total_candidates > 0 else 0.0

            return {
                "totalScreenings": total_screenings,
                "totalCandidates": total_candidates,
                "avgTurnaroundByType": avg_turnaround,
                "disputeRate": round(dispute_rate, 4),
                "adverseActionRate": round(adverse_rate, 4),
                "sourceReliability": source_reliability,
                "industryAvgTurnaround": INDUSTRY_AVG_TURNAROUND,
            }


@router.get("/time-series")
def get_compliance_time_series(days: int = 30):
    """Generate time-series data for compliance charts."""
    rng = random.Random(42)  # Deterministic for consistent demo charts
    now = datetime.now(timezone.utc)
    result = []

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM screening_runs")
            total = cur.fetchone()[0] or 0
            base_per_day = max(1, total // days)

            for i in range(days - 1, -1, -1):
                date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
                screenings = base_per_day + rng.randint(-1, 3)
                disputes = rng.randint(0, max(1, screenings // 8))
                adverse = rng.randint(0, max(1, screenings // 12))
                avg_turnaround = 1400 + rng.randint(-200, 400)
                result.append({
                    "date": date,
                    "screenings": max(0, screenings),
                    "disputes": disputes,
                    "adverseActions": adverse,
                    "avgTurnaround": avg_turnaround,
                })

    return result


@router.get("/ai-insight")
def get_compliance_ai_insight():
    """Generate AI compliance insights based on current metrics."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM candidates")
            total_candidates = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM screening_runs")
            total_screenings = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM disputes")
            total_disputes = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM adverse_actions")
            total_adverse = cur.fetchone()[0]
            cur.execute("""
                SELECT check_type, AVG(processing_time_ms)::float
                FROM check_results GROUP BY check_type
            """)
            avg_turnaround = {r[0]: round(r[1]) for r in cur.fetchall() if r[1]}

    metrics = {
        "totalScreenings": total_screenings,
        "totalCandidates": total_candidates,
        "disputeRate": (total_disputes / total_screenings) if total_screenings > 0 else 0.0,
        "adverseActionRate": (total_adverse / total_candidates) if total_candidates > 0 else 0.0,
        "avgTurnaroundByType": avg_turnaround,
        "sourceReliability": {},
    }

    return generate_compliance_insight(metrics)
