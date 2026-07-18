"""
ScreenIQ FastAPI Backend
Background screening simulation platform with AI-powered risk assessment.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import (
    candidates, screening, risk_assessment, compliance,
    adverse_action, disputes, portal, dashboard, analytics, reports
)

app = FastAPI(
    title="ScreenIQ API",
    description="Background Screening Simulation Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under /api prefix
app.include_router(candidates.router, prefix="/api")
app.include_router(screening.router, prefix="/api")
app.include_router(risk_assessment.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(adverse_action.router, prefix="/api")
app.include_router(disputes.router, prefix="/api")
app.include_router(portal.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/api/healthz")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def startup_event():
    init_db()
    _seed_demo_data()


def _seed_demo_data():
    """Seed demo candidates (employment + tenant) so the app isn't empty on first load."""
    from database import get_db
    import secrets
    from simulation import simulate_all_checks
    from datetime import datetime, timezone
    import json

    demo_candidates = [
        # Employment screening candidates
        {"name": "Jordan Mitchell", "dob": "1988-04-15", "ssn": "4521", "position": "Software Engineer", "email": "jordan.m@email.com", "status": "completed", "screening_type": "employment"},
        {"name": "Priya Sharma", "dob": "1992-09-22", "ssn": "7834", "position": "Financial Analyst", "email": "p.sharma@email.com", "status": "completed", "screening_type": "employment"},
        {"name": "Marcus Thompson", "dob": "1985-01-30", "ssn": "2190", "position": "Senior Manager", "email": "m.thompson@email.com", "status": "flagged", "screening_type": "employment"},
        {"name": "Elena Rodriguez", "dob": "1994-07-08", "ssn": "6673", "position": "Operations Lead", "email": "e.rod@email.com", "status": "in_progress", "screening_type": "employment"},
        {"name": "David Chen", "dob": "1990-12-03", "ssn": "9012", "position": "Data Scientist", "email": "d.chen@email.com", "status": "completed", "screening_type": "employment"},
        # Tenant screening candidates
        {"name": "Sarah Kim", "dob": "1991-03-17", "ssn": "5512", "position": "Unit 4B — 2BR Applicant", "email": "s.kim@email.com", "status": "completed", "screening_type": "tenant"},
        {"name": "Robert Hayes", "dob": "1978-11-02", "ssn": "8831", "position": "Unit 12A — Studio Applicant", "email": "r.hayes@email.com", "status": "flagged", "screening_type": "tenant"},
    ]

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM candidates")
            count = cur.fetchone()[0]
            if count > 0:
                return  # Already seeded

            now = datetime.now(timezone.utc)

            for demo in demo_candidates:
                portal_token = secrets.token_urlsafe(24)
                screening_type = demo.get("screening_type", "employment")
                cur.execute("""
                    INSERT INTO candidates (name, date_of_birth, ssn_last_four, position, email, status, portal_token, screening_type, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (demo["name"], demo["dob"], demo["ssn"], demo["position"], demo["email"], demo["status"], portal_token, screening_type, now, now))
                candidate_id = cur.fetchone()[0]

                if demo["status"] in ("completed", "flagged"):
                    checks = simulate_all_checks(demo["name"], screening_type=screening_type)
                    cur.execute("""
                        INSERT INTO screening_runs (candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at)
                        VALUES (%s, 'completed', %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (candidate_id, len(checks), len(checks), now, now, now))
                    run_id = cur.fetchone()[0]

                    cur.execute("UPDATE candidates SET latest_run_id=%s WHERE id=%s", (run_id, candidate_id))

                    for check in checks:
                        cur.execute("""
                            INSERT INTO check_results (screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            run_id, check["check_type"], check["status"], check["status_label"],
                            check["data_source"], check["confidence_score"], check["processing_time_ms"],
                            json.dumps(check["details"]), now
                        ))
