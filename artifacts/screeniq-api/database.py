import os
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

connection_pool = pool.ThreadedConnectionPool(1, 20, DATABASE_URL)


@contextmanager
def get_db():
    conn = connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        connection_pool.putconn(conn)


def init_db():
    """Create all tables if they don't exist."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS candidates (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    date_of_birth TEXT,
                    ssn_last_four TEXT,
                    position TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    portal_token TEXT NOT NULL UNIQUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS screening_runs (
                    id SERIAL PRIMARY KEY,
                    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                    status TEXT NOT NULL DEFAULT 'pending',
                    checks_total INTEGER NOT NULL DEFAULT 4,
                    checks_completed INTEGER NOT NULL DEFAULT 0,
                    started_at TIMESTAMPTZ,
                    completed_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS check_results (
                    id SERIAL PRIMARY KEY,
                    screening_run_id INTEGER NOT NULL REFERENCES screening_runs(id) ON DELETE CASCADE,
                    check_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    status_label TEXT NOT NULL,
                    data_source TEXT NOT NULL,
                    confidence_score NUMERIC(5,2) NOT NULL,
                    processing_time_ms INTEGER NOT NULL,
                    details JSONB NOT NULL DEFAULT '{}',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS risk_assessments (
                    id SERIAL PRIMARY KEY,
                    screening_run_id INTEGER NOT NULL UNIQUE REFERENCES screening_runs(id) ON DELETE CASCADE,
                    overall_risk TEXT NOT NULL,
                    key_findings TEXT NOT NULL,
                    recommended_steps TEXT NOT NULL,
                    fcra_adverse_flag BOOLEAN NOT NULL DEFAULT FALSE,
                    risk_factors JSONB NOT NULL DEFAULT '[]',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS adverse_actions (
                    id SERIAL PRIMARY KEY,
                    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                    screening_run_id INTEGER NOT NULL REFERENCES screening_runs(id) ON DELETE CASCADE,
                    stage TEXT NOT NULL DEFAULT 'pre_adverse',
                    reason TEXT,
                    pre_adverse_notice_sent_at TIMESTAMPTZ,
                    waiting_period_ends_at TIMESTAMPTZ,
                    final_notice_at TIMESTAMPTZ,
                    closed_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS adverse_action_notices (
                    id SERIAL PRIMARY KEY,
                    adverse_action_id INTEGER NOT NULL REFERENCES adverse_actions(id) ON DELETE CASCADE,
                    notice_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    sent_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS disputes (
                    id SERIAL PRIMARY KEY,
                    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                    check_result_id INTEGER NOT NULL REFERENCES check_results(id) ON DELETE CASCADE,
                    reason TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'open',
                    resolution TEXT,
                    supporting_doc_url TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)
