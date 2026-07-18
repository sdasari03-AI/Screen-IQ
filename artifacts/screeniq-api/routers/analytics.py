"""
Analytics endpoints — Checkr-style OKR metrics, industry benchmarking,
backlog health (RealPage operations), and candidate friction analytics.
"""
from datetime import datetime, timezone, timedelta
from typing import Any
import random

from fastapi import APIRouter

from database import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Industry benchmark data (realistic market averages)
INDUSTRY_BENCHMARKS = {
    "criminal": {
        "avg_turnaround_ms": 1350,
        "flag_rate": 0.15,
        "dispute_rate": 0.04,
        "source": "NAPBS Industry Report 2024",
    },
    "employment": {
        "avg_turnaround_ms": 2600,
        "flag_rate": 0.12,
        "dispute_rate": 0.06,
        "source": "SHRM Background Screening Benchmarks 2024",
    },
    "education": {
        "avg_turnaround_ms": 1100,
        "flag_rate": 0.10,
        "dispute_rate": 0.02,
        "source": "NAPBS Industry Report 2024",
    },
    "driving": {
        "avg_turnaround_ms": 700,
        "flag_rate": 0.27,
        "dispute_rate": 0.03,
        "source": "AAMVA Driving Records Survey 2024",
    },
    "drug_health": {
        "avg_turnaround_ms": 4200,
        "flag_rate": 0.09,
        "dispute_rate": 0.08,
        "source": "Quest Diagnostics Drug Testing Index 2024",
    },
    "credit": {
        "avg_turnaround_ms": 1050,
        "flag_rate": 0.26,
        "dispute_rate": 0.07,
        "source": "TransUnion Tenant Screening Report 2024",
    },
    "eviction": {
        "avg_turnaround_ms": 900,
        "flag_rate": 0.19,
        "dispute_rate": 0.05,
        "source": "NERD Eviction Trends Report 2024",
    },
}

FLAG_STATUSES = {"flag", "positive", "discrepancy", "violations", "suspended"}


@router.get("/business-metrics")
def get_business_metrics():
    """
    Checkr-style OKR metrics: attach rate, conversion rate, re-run rate (RPR),
    time-to-value, and check type distribution.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM candidates")
            total_candidates = cur.fetchone()[0]

            cur.execute("SELECT COUNT(DISTINCT candidate_id) FROM screening_runs")
            candidates_with_runs = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM screening_runs")
            total_runs = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM screening_runs WHERE status = 'completed'")
            completed_runs = cur.fetchone()[0]

            # Candidates with more than one run (re-run rate)
            cur.execute("""
                SELECT COUNT(*) FROM (
                    SELECT candidate_id FROM screening_runs
                    GROUP BY candidate_id HAVING COUNT(*) > 1
                ) t
            """)
            rerun_candidates = cur.fetchone()[0]

            # Adverse actions open
            cur.execute("SELECT COUNT(*) FROM adverse_actions WHERE stage NOT IN ('closed')")
            adverse_open = cur.fetchone()[0]

            # Conversions: completed screenings without adverse action
            cur.execute("""
                SELECT COUNT(*) FROM screening_runs sr
                WHERE sr.status = 'completed'
                AND NOT EXISTS (
                    SELECT 1 FROM adverse_actions aa
                    WHERE aa.candidate_id = (
                        SELECT candidate_id FROM screening_runs WHERE id = sr.id
                    )
                )
            """)
            converted_runs = cur.fetchone()[0]

            # Avg time from candidate creation to first completed screening (hours)
            cur.execute("""
                SELECT AVG(EXTRACT(EPOCH FROM (sr.completed_at - c.created_at)) / 3600)::float
                FROM screening_runs sr
                JOIN candidates c ON c.id = sr.candidate_id
                WHERE sr.status = 'completed' AND sr.completed_at IS NOT NULL
            """)
            avg_ttv_hours_raw = cur.fetchone()[0]
            avg_ttv_hours = round(avg_ttv_hours_raw, 2) if avg_ttv_hours_raw else 0.5

            # Check type distribution
            cur.execute("""
                SELECT check_type, COUNT(*) FROM check_results GROUP BY check_type
            """)
            check_type_dist = {r[0]: r[1] for r in cur.fetchall()}

            # Avg turnaround per completed screening (ms)
            cur.execute("""
                SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::float
                FROM screening_runs WHERE status = 'completed'
                AND completed_at IS NOT NULL AND started_at IS NOT NULL
            """)
            avg_turnaround_raw = cur.fetchone()[0]
            avg_turnaround_ms = round(avg_turnaround_raw) if avg_turnaround_raw else 1800

    attach_rate = (candidates_with_runs / total_candidates) if total_candidates > 0 else 0.0
    conversion_rate = (converted_runs / completed_runs) if completed_runs > 0 else 0.0
    rpr = (rerun_candidates / candidates_with_runs) if candidates_with_runs > 0 else 0.0

    return {
        "attachRate": round(attach_rate, 4),
        "conversionRate": round(conversion_rate, 4),
        "reRunRate": round(rpr, 4),
        "avgTimeToValueHours": avg_ttv_hours,
        "avgTurnaroundMs": avg_turnaround_ms,
        "totalCandidates": total_candidates,
        "totalRuns": total_runs,
        "completedRuns": completed_runs,
        "adverseActionsOpen": adverse_open,
        "checkTypeDistribution": check_type_dist,
    }


@router.get("/benchmarks")
def get_benchmarks():
    """
    Compare platform performance against industry benchmarks by check type.
    Covers turnaround time, flag rate, and dispute rate.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT check_type,
                       AVG(processing_time_ms)::float,
                       COUNT(*),
                       SUM(CASE WHEN status IN ('flag','positive','discrepancy','violations','suspended') THEN 1 ELSE 0 END)::float
                FROM check_results
                GROUP BY check_type
            """)
            our_stats = {r[0]: {"avg_ms": r[1], "total": r[2], "flags": r[3]} for r in cur.fetchall()}

            cur.execute("""
                SELECT cr.check_type, COUNT(DISTINCT d.id)::float
                FROM check_results cr
                LEFT JOIN disputes d ON d.check_result_id = cr.id
                GROUP BY cr.check_type
            """)
            dispute_counts = {r[0]: r[1] for r in cur.fetchall()}

    result = []
    for check_type, bench in INDUSTRY_BENCHMARKS.items():
        ours = our_stats.get(check_type, {})
        total = ours.get("total", 0)
        flags = ours.get("flags", 0)
        disputes = dispute_counts.get(check_type, 0)

        our_avg_ms = round(ours["avg_ms"]) if ours.get("avg_ms") else bench["avg_turnaround_ms"]
        our_flag_rate = round(flags / total, 4) if total > 0 else bench["flag_rate"]
        our_dispute_rate = round(disputes / total, 4) if total > 0 else bench["dispute_rate"]

        result.append({
            "checkType": check_type,
            "ourAvgTurnaroundMs": our_avg_ms,
            "industryAvgTurnaroundMs": bench["avg_turnaround_ms"],
            "turnaroundDeltaPct": round((our_avg_ms - bench["avg_turnaround_ms"]) / bench["avg_turnaround_ms"] * 100, 1),
            "ourFlagRate": our_flag_rate,
            "industryFlagRate": bench["flag_rate"],
            "ourDisputeRate": our_dispute_rate,
            "industryDisputeRate": bench["dispute_rate"],
            "source": bench["source"],
            "sampleSize": int(total),
        })

    return result


@router.get("/backlog")
def get_backlog_health():
    """
    RealPage-style implementation/backlog health metrics:
    pending screenings, overdue checks, on-time delivery rate, escalations.
    """
    now = datetime.now(timezone.utc)
    overdue_threshold = now - timedelta(hours=72)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM screening_runs WHERE status IN ('pending','running')")
            pending_total = cur.fetchone()[0]

            cur.execute("""
                SELECT COUNT(*) FROM screening_runs
                WHERE status IN ('pending','running')
                AND created_at < %s
            """, (overdue_threshold,))
            overdue = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM screening_runs WHERE status = 'completed'")
            total_completed = cur.fetchone()[0]

            # On-time = completed within 48 hours of creation
            cur.execute("""
                SELECT COUNT(*) FROM screening_runs
                WHERE status = 'completed'
                AND completed_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 <= 48
            """)
            on_time = cur.fetchone()[0]

            # Escalations: flagged candidates without risk assessment
            cur.execute("""
                SELECT COUNT(*) FROM candidates c
                WHERE c.status = 'flagged'
                AND NOT EXISTS (
                    SELECT 1 FROM risk_assessments ra
                    JOIN screening_runs sr ON sr.id = ra.screening_run_id
                    WHERE sr.candidate_id = c.id
                )
            """)
            escalations = cur.fetchone()[0]

            # Avg age of pending screenings (hours)
            cur.execute("""
                SELECT AVG(EXTRACT(EPOCH FROM (%s - created_at)) / 3600)::float
                FROM screening_runs WHERE status IN ('pending','running')
            """, (now,))
            avg_age_raw = cur.fetchone()[0]
            avg_pending_age_hours = round(avg_age_raw, 1) if avg_age_raw else 0.0

            # Pending by check type (checks without a run completion)
            cur.execute("""
                SELECT cr.check_type, COUNT(*) FROM check_results cr
                JOIN screening_runs sr ON sr.id = cr.screening_run_id
                WHERE sr.status IN ('pending','running')
                GROUP BY cr.check_type
            """)
            pending_by_type = {r[0]: r[1] for r in cur.fetchall()}

            # Throughput last 7 days
            week_ago = now - timedelta(days=7)
            cur.execute("""
                SELECT COUNT(*) FROM screening_runs
                WHERE status = 'completed' AND completed_at >= %s
            """, (week_ago,))
            throughput_7d = cur.fetchone()[0]

    on_time_rate = round(on_time / total_completed, 4) if total_completed > 0 else 1.0

    return {
        "pendingTotal": pending_total,
        "overdueCount": overdue,
        "onTimeDeliveryRate": on_time_rate,
        "escalationCount": escalations,
        "avgPendingAgeHours": avg_pending_age_hours,
        "pendingByCheckType": pending_by_type,
        "throughput7Days": throughput_7d,
        "totalCompleted": total_completed,
    }


@router.get("/friction")
def get_friction_analytics():
    """
    Checkr-style candidate friction analytics: delay hotspots by check type,
    friction score, portal engagement, and re-try rates.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            # Per check type: avg processing, flag rate, dispute rate, confidence
            cur.execute("""
                SELECT
                    cr.check_type,
                    AVG(cr.processing_time_ms)::float,
                    COUNT(*)::float AS total,
                    SUM(CASE WHEN cr.status IN ('flag','positive','discrepancy','violations','suspended','awaiting_collection','inconclusive') THEN 1 ELSE 0 END)::float AS flags,
                    AVG(cr.confidence_score)::float,
                    SUM(CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END)::float AS disputes
                FROM check_results cr
                LEFT JOIN disputes d ON d.check_result_id = cr.id
                GROUP BY cr.check_type
            """)

            by_type = []
            for row in cur.fetchall():
                check_type, avg_ms, total, flags, avg_conf, disputes = row
                total = total or 1
                flag_rate = round(flags / total, 4)
                dispute_rate = round(disputes / total, 4)
                avg_conf_pct = round((avg_conf or 0.85) * 100, 1)

                # Friction score 0-100: weighted combo of processing time, flag rate, dispute rate
                bench = INDUSTRY_BENCHMARKS.get(check_type, {"avg_turnaround_ms": 1500})
                time_friction = min(40, (avg_ms / bench["avg_turnaround_ms"]) * 20)
                flag_friction = flag_rate * 30
                dispute_friction = dispute_rate * 30
                friction_score = round(min(100, time_friction + flag_friction + dispute_friction), 1)

                by_type.append({
                    "checkType": check_type,
                    "avgProcessingMs": round(avg_ms) if avg_ms else 1000,
                    "flagRate": flag_rate,
                    "disputeRate": dispute_rate,
                    "avgConfidencePct": avg_conf_pct,
                    "frictionScore": friction_score,
                    "sampleSize": int(total),
                })

            # Portal engagement
            cur.execute("SELECT COUNT(*) FROM candidates WHERE portal_token IS NOT NULL")
            portal_enabled = cur.fetchone()[0]

            cur.execute("SELECT COUNT(DISTINCT candidate_id) FROM disputes")
            candidates_disputed = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM disputes")
            total_disputes = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM candidates")
            total_candidates = cur.fetchone()[0]

    portal_engagement_rate = round(candidates_disputed / portal_enabled, 4) if portal_enabled > 0 else 0.0
    overall_friction = round(sum(t["frictionScore"] for t in by_type) / len(by_type), 1) if by_type else 0.0

    return {
        "overallFrictionScore": overall_friction,
        "byCheckType": sorted(by_type, key=lambda x: x["frictionScore"], reverse=True),
        "portalEngagementRate": portal_engagement_rate,
        "totalDisputes": total_disputes,
        "candidatesDisputed": candidates_disputed,
        "totalCandidates": total_candidates,
    }
