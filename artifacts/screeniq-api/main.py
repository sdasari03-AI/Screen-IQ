"""
ScreenIQ FastAPI Backend
Background screening simulation platform with AI-powered risk assessment.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import candidates, screening, risk_assessment, compliance, adverse_action, disputes, portal, dashboard

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


@app.get("/api/healthz")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def startup_event():
    init_db()
    _seed_demo_data()


def _seed_demo_data():
    """Seed a few demo candidates so the app isn't empty on first load."""
    from database import get_db
    import secrets
    from simulation import simulate_all_checks
    from datetime import datetime, timezone
    import json

    demo_candidates = [
        {"name": "Jordan Mitchell", "dob": "1988-04-15", "ssn": "4521", "position": "Software Engineer", "email": "jordan.m@email.com", "status": "completed"},
        {"name": "Priya Sharma", "dob": "1992-09-22", "ssn": "7834", "position": "Financial Analyst", "email": "p.sharma@email.com", "status": "completed"},
        {"name": "Marcus Thompson", "dob": "1985-01-30", "ssn": "2190", "position": "Senior Manager", "email": "m.thompson@email.com", "status": "flagged"},
        {"name": "Elena Rodriguez", "dob": "1994-07-08", "ssn": "6673", "position": "Operations Lead", "email": "e.rod@email.com", "status": "in_progress"},
        {"name": "David Chen", "dob": "1990-12-03", "ssn": "9012", "position": "Data Scientist", "email": "d.chen@email.com", "status": "completed"},
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
                cur.execute("""
                    INSERT INTO candidates (name, date_of_birth, ssn_last_four, position, email, status, portal_token, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (demo["name"], demo["dob"], demo["ssn"], demo["position"], demo["email"], demo["status"], portal_token, now, now))
                candidate_id = cur.fetchone()[0]

                if demo["status"] in ("completed", "flagged"):
                    cur.execute("""
                        INSERT INTO screening_runs (candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at)
                        VALUES (%s, 'completed', 4, 4, %s, %s, %s)
                        RETURNING id
                    """, (candidate_id, now, now, now))
                    run_id = cur.fetchone()[0]

                    # Update candidate latest_run
                    cur.execute("UPDATE candidates SET status=%s WHERE id=%s", (demo["status"], candidate_id))

                    checks = simulate_all_checks(demo["name"])
                    for check in checks:
                        cur.execute("""
                            INSERT INTO check_results (screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            run_id, check["check_type"], check["status"], check["status_label"],
                            check["data_source"], check["confidence_score"], check["processing_time_ms"],
                            json.dumps(check["details"]), now
                        ))
