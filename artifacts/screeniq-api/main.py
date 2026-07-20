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
    adverse_action, disputes, portal, dashboard, analytics, reports,
    ai_intelligence, monitoring, drug_testing, mcp_server
)

app = FastAPI(
    title="ScreenIQ API",
    description="Background Screening Simulation Platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
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

# Extension routers
app.include_router(ai_intelligence.router, prefix="/api")
app.include_router(monitoring.router, prefix="/api")
app.include_router(drug_testing.router, prefix="/api")
app.include_router(mcp_server.router, prefix="/api")


@app.get("/api/healthz")
def health_check():
    return {"status": "ok", "version": "2.0.0"}


@app.on_event("startup")
def startup_event():
    init_db()
    _seed_demo_data()
    _seed_extension_data()


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


def _seed_extension_data():
    """Seed extension demo data — only runs if extension tables are empty."""
    from database import get_db
    import secrets
    from simulation import simulate_all_checks
    from datetime import datetime, timezone, timedelta
    import json

    with get_db() as conn:
        with conn.cursor() as cur:
            # ── Check if extension data already seeded ─────────────────────
            cur.execute("SELECT COUNT(*) FROM monitoring_enrollments")
            if cur.fetchone()[0] > 0:
                return  # Already done

            now = datetime.now(timezone.utc)

            # ── Get existing candidate IDs ─────────────────────────────────
            cur.execute("SELECT id, name FROM candidates ORDER BY id")
            existing = cur.fetchall()
            if not existing:
                return

            cid_map = {row[1]: row[0] for row in existing}

            # ── 1. Criminal charge candidates (for Charge Classifier demo) ──
            for cdata in [
                {
                    "name": "Tyler Brooks",
                    "dob": "1987-06-12",
                    "ssn": "3345",
                    "position": "Warehouse Supervisor",
                    "email": "t.brooks@email.com",
                    "status": "flagged",
                    "screening_type": "employment",
                    "charge": "Burglary 2nd Degree (Felony) — 2019, Dismissed after plea agreement",
                },
                {
                    "name": "Keisha Monroe",
                    "dob": "1995-11-28",
                    "ssn": "8812",
                    "position": "Delivery Driver",
                    "email": "k.monroe@email.com",
                    "status": "flagged",
                    "screening_type": "employment",
                    "charge": "DUI — First Offense (Misdemeanor) — 2022, Convicted, Probation 12 months",
                },
            ]:
                portal_token = secrets.token_urlsafe(24)
                cur.execute("""
                    INSERT INTO candidates (name, date_of_birth, ssn_last_four, position, email, status, portal_token, screening_type, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (cdata["name"], cdata["dob"], cdata["ssn"], cdata["position"], cdata["email"], cdata["status"], portal_token, cdata["screening_type"], now, now))
                cid = cur.fetchone()[0]
                cid_map[cdata["name"]] = cid

                checks = simulate_all_checks(cdata["name"], screening_type=cdata["screening_type"])
                # Override the criminal check to reflect the actual charge
                for check in checks:
                    if check["check_type"] == "criminal":
                        check["status"] = "flag"
                        check["status_label"] = "Criminal Record Found"
                        check["details"]["charge_string"] = cdata["charge"]
                        check["confidence_score"] = 0.94

                cur.execute("""
                    INSERT INTO screening_runs (candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at)
                    VALUES (%s, 'completed', %s, %s, %s, %s, %s) RETURNING id
                """, (cid, len(checks), len(checks), now, now, now))
                run_id = cur.fetchone()[0]
                cur.execute("UPDATE candidates SET latest_run_id=%s WHERE id=%s", (run_id, cid))
                for check in checks:
                    cur.execute("""
                        INSERT INTO check_results (screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (run_id, check["check_type"], check["status"], check["status_label"],
                          check["data_source"], check["confidence_score"], check["processing_time_ms"],
                          json.dumps(check["details"]), now))

            # ── 2. Name alias candidate ────────────────────────────────────
            portal_token = secrets.token_urlsafe(24)
            cur.execute("""
                INSERT INTO candidates (name, date_of_birth, ssn_last_four, position, email, status, portal_token, screening_type, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, ("Maria Gonzalez-Santos", "1989-04-02", "5501", "HR Coordinator", "m.gonzalez@email.com", "flagged", portal_token, "employment", now, now))
            alias_cid = cur.fetchone()[0]
            cid_map["Maria Gonzalez-Santos"] = alias_cid

            checks = simulate_all_checks("Maria Gonzalez-Santos")
            for check in checks:
                if check["check_type"] == "criminal":
                    check["status"] = "flag"
                    check["status_label"] = "Record Found Under Alias"
                    check["details"]["alias_match"] = "Maria Santos (maiden name) — criminal record found under pre-marriage name"
                    check["confidence_score"] = 0.88

            cur.execute("""
                INSERT INTO screening_runs (candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at)
                VALUES (%s, 'completed', %s, %s, %s, %s, %s) RETURNING id
            """, (alias_cid, len(checks), len(checks), now, now, now))
            run_id = cur.fetchone()[0]
            cur.execute("UPDATE candidates SET latest_run_id=%s WHERE id=%s", (run_id, alias_cid))
            for check in checks:
                cur.execute("""
                    INSERT INTO check_results (screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (run_id, check["check_type"], check["status"], check["status_label"],
                      check["data_source"], check["confidence_score"], check["processing_time_ms"],
                      json.dumps(check["details"]), now))

            # ── 3. Employment title discrepancy candidate ──────────────────
            portal_token = secrets.token_urlsafe(24)
            cur.execute("""
                INSERT INTO candidates (name, date_of_birth, ssn_last_four, position, email, status, portal_token, screening_type, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, ("James Whitfield", "1983-09-14", "7742", "VP of Engineering", "j.whitfield@email.com", "flagged", portal_token, "employment", now, now))
            disc_cid = cur.fetchone()[0]
            cid_map["James Whitfield"] = disc_cid

            checks = simulate_all_checks("James Whitfield")
            for check in checks:
                if check["check_type"] == "employment":
                    check["status"] = "discrepancy"
                    check["status_label"] = "Title Discrepancy Found"
                    check["details"]["claimed_title"] = "VP of Engineering"
                    check["details"]["verified_title"] = "Senior Software Engineer"
                    check["details"]["employer"] = "Apex Technologies Inc."
                    check["details"]["employment_dates"] = "2018-03 to 2022-11 (verified)"
                    check["confidence_score"] = 0.96

            cur.execute("""
                INSERT INTO screening_runs (candidate_id, status, checks_total, checks_completed, started_at, completed_at, created_at)
                VALUES (%s, 'completed', %s, %s, %s, %s, %s) RETURNING id
            """, (disc_cid, len(checks), len(checks), now, now, now))
            run_id = cur.fetchone()[0]
            cur.execute("UPDATE candidates SET latest_run_id=%s WHERE id=%s", (run_id, disc_cid))
            for check in checks:
                cur.execute("""
                    INSERT INTO check_results (screening_run_id, check_type, status, status_label, data_source, confidence_score, processing_time_ms, details, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (run_id, check["check_type"], check["status"], check["status_label"],
                      check["data_source"], check["confidence_score"], check["processing_time_ms"],
                      json.dumps(check["details"]), now))

            # ── 4. Drug test results for 3 candidates ─────────────────────
            drug_candidates = [
                (cid_map.get("Jordan Mitchell", 1), "5_panel_urine", "negative", False),
                (cid_map.get("Marcus Thompson", 3), "10_panel_urine", "positive", True),
                (cid_map.get("David Chen", 5), "dot_5_panel", "dilute", True),
            ]
            for did, test_type, result, mro_req in drug_candidates:
                coc = f"COC-{did:04d}A"
                collection_site = {"name": "Quest Diagnostics", "address": "5678 Health Blvd, Austin TX 78702", "distance_miles": 1.4}
                dot_flags = []
                if test_type == "dot_5_panel" and result in ("positive", "dilute") and mro_req:
                    dot_flags = ["Non-negative result — MRO review required before finalizing per DOT 49 CFR Part 40"]
                status = "pending_mro" if mro_req else "resulted"
                cur.execute("""
                    INSERT INTO drug_tests (candidate_id, test_type, status, result, mro_review_required, mro_review_complete,
                        chain_of_custody_id, collection_site, ordered_at, collected_at, resulted_at, dot_compliance_flags)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (did, test_type, status, result, mro_req, not mro_req, coc,
                      json.dumps(collection_site), now, now + timedelta(hours=2),
                      now + timedelta(hours=24), json.dumps(dot_flags)))

            # ── 5. Continuous monitoring — enroll 5 employees ─────────────
            monitoring_candidates = [
                cid_map.get("Jordan Mitchell"),
                cid_map.get("Priya Sharma"),
                cid_map.get("David Chen"),
                cid_map.get("Tyler Brooks"),
                cid_map.get("Keisha Monroe"),
            ]
            for mc_id in monitoring_candidates:
                if mc_id:
                    cur.execute("""
                        INSERT INTO monitoring_enrollments (candidate_id, enrolled_at, status, monitor_types)
                        VALUES (%s, %s, 'active', %s)
                        ON CONFLICT (candidate_id) DO NOTHING
                    """, (mc_id, now - timedelta(days=45), json.dumps(["criminal", "driving", "sanctions", "license"])))

            # ── 6. Post-hire alert — DUI charge for enrolled employee ──────
            keisha_id = cid_map.get("Keisha Monroe")
            if keisha_id:
                cur.execute("""
                    INSERT INTO monitoring_alerts (candidate_id, alert_type, severity, description, charge, filed_at, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    keisha_id,
                    "new_criminal_filing",
                    "critical",
                    "New criminal filing detected post-hire. Charge: DUI — First Offense. Requires immediate review and adjudication.",
                    "DUI — First Offense (Misdemeanor)",
                    now - timedelta(days=8),
                    "open",
                    now - timedelta(days=8),
                ))

            # Warning alert for Tyler Brooks
            tyler_id = cid_map.get("Tyler Brooks")
            if tyler_id:
                cur.execute("""
                    INSERT INTO monitoring_alerts (candidate_id, alert_type, severity, description, charge, filed_at, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    tyler_id,
                    "driving_record_change",
                    "warning",
                    "Driving record updated: new speeding violation (15 mph over) and license placed on probationary status.",
                    "Speeding — 15 mph Over (Traffic Infraction)",
                    now - timedelta(days=3),
                    "open",
                    now - timedelta(days=3),
                ))
