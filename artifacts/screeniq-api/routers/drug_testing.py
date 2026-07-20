"""
Drug Testing Module — 5 test types, DOT compliance, MRO review workflow,
chain of custody tracking, collection site locator.
"""
import json
import random
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter(prefix="/drug-tests", tags=["drug_testing"])

TEST_TYPES = {
    "5_panel_urine": {
        "label": "5-Panel Urine (Standard non-DOT)",
        "panels": ["THC", "Cocaine", "Opiates", "PCP", "Amphetamines"],
        "dot_regulated": False,
        "mro_required": False,
        "turnaround_hours": 24,
        "window_days": 3,
    },
    "10_panel_urine": {
        "label": "10-Panel Urine (Extended)",
        "panels": ["THC", "Cocaine", "Opiates", "PCP", "Amphetamines", "Benzodiazepines", "Barbiturates", "Methadone", "Propoxyphene", "Methaqualone"],
        "dot_regulated": False,
        "mro_required": False,
        "turnaround_hours": 48,
        "window_days": 3,
    },
    "dot_5_panel": {
        "label": "DOT 5-Panel (Federally Regulated)",
        "panels": ["THC", "Cocaine", "Opiates/Codeine", "PCP", "Amphetamines/MDMA"],
        "dot_regulated": True,
        "mro_required": True,
        "turnaround_hours": 72,
        "window_days": 3,
    },
    "hair_follicle": {
        "label": "Hair Follicle (90-Day Window)",
        "panels": ["THC", "Cocaine", "Opiates", "PCP", "Amphetamines"],
        "dot_regulated": False,
        "mro_required": False,
        "turnaround_hours": 72,
        "window_days": 90,
    },
    "oral_fluid": {
        "label": "Oral Fluid (Recent Use)",
        "panels": ["THC", "Cocaine", "Opiates", "PCP", "Amphetamines"],
        "dot_regulated": False,
        "mro_required": False,
        "turnaround_hours": 24,
        "window_days": 2,
    },
}

COLLECTION_SITES = [
    {"name": "LabCorp Patient Service Center", "address": "1234 Medical Dr, Austin TX 78701", "distance_miles": 0.8, "hours": "Mon-Fri 7am-5pm"},
    {"name": "Quest Diagnostics", "address": "5678 Health Blvd, Austin TX 78702", "distance_miles": 1.4, "hours": "Mon-Sat 7am-4pm"},
    {"name": "CareNow Urgent Care — Drug Screen", "address": "910 Wellness Ave, Austin TX 78703", "distance_miles": 2.1, "hours": "Mon-Sun 8am-8pm"},
    {"name": "Concentra Occupational Health", "address": "321 Employer Pkwy, Austin TX 78704", "distance_miles": 2.9, "hours": "Mon-Fri 8am-5pm"},
]

RESULT_DISTRIBUTION = [
    ("negative", 0.85),
    ("positive", 0.07),
    ("dilute", 0.04),
    ("refused", 0.01),
    ("invalid", 0.02),
    ("cancelled", 0.01),
]


def simulate_drug_result(seed: str) -> str:
    rng = random.Random(seed)
    r = rng.random()
    cumulative = 0
    for status, prob in RESULT_DISTRIBUTION:
        cumulative += prob
        if r <= cumulative:
            return status
    return "negative"


def row_to_drug_test(row) -> dict[str, Any]:
    test_type_key = row[3]
    test_info = TEST_TYPES.get(test_type_key, {})
    return {
        "id": row[0],
        "candidateId": row[1],
        "candidateName": row[2],
        "testType": test_type_key,
        "testTypeLabel": test_info.get("label", test_type_key),
        "panels": test_info.get("panels", []),
        "dotRegulated": test_info.get("dot_regulated", False),
        "mroRequired": test_info.get("mro_required", False),
        "status": row[4],
        "result": row[5],
        "mroReviewRequired": row[6],
        "mroReviewComplete": row[7],
        "chainOfCustodyId": row[8],
        "collectionSite": row[9] if isinstance(row[9], dict) else json.loads(row[9] or "{}"),
        "orderedAt": row[10].isoformat() if row[10] else None,
        "collectedAt": row[11].isoformat() if row[11] else None,
        "resultedAt": row[12].isoformat() if row[12] else None,
        "dotComplianceFlags": row[13] if isinstance(row[13], list) else json.loads(row[13] or "[]"),
    }


class DrugTestOrder(BaseModel):
    candidateId: int
    testType: str


@router.get("")
def list_drug_tests():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT dt.id, dt.candidate_id, c.name, dt.test_type, dt.status, dt.result,
                       dt.mro_review_required, dt.mro_review_complete, dt.chain_of_custody_id,
                       dt.collection_site, dt.ordered_at, dt.collected_at, dt.resulted_at,
                       dt.dot_compliance_flags
                FROM drug_tests dt
                JOIN candidates c ON c.id = dt.candidate_id
                ORDER BY dt.ordered_at DESC
            """)
            return [row_to_drug_test(r) for r in cur.fetchall()]


@router.get("/{test_id}")
def get_drug_test(test_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT dt.id, dt.candidate_id, c.name, dt.test_type, dt.status, dt.result,
                       dt.mro_review_required, dt.mro_review_complete, dt.chain_of_custody_id,
                       dt.collection_site, dt.ordered_at, dt.collected_at, dt.resulted_at,
                       dt.dot_compliance_flags
                FROM drug_tests dt
                JOIN candidates c ON c.id = dt.candidate_id
                WHERE dt.id = %s
            """, (test_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Drug test not found")
            return row_to_drug_test(row)


@router.post("/order", status_code=201)
def order_drug_test(body: DrugTestOrder):
    if body.testType not in TEST_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown test type. Valid: {list(TEST_TYPES.keys())}")

    test_info = TEST_TYPES[body.testType]
    now = datetime.now(timezone.utc)
    coc_id = f"COC-{secrets.token_hex(4).upper()}"
    result_seed = f"{body.candidateId}-{body.testType}-{now.date()}"
    simulated_result = simulate_drug_result(result_seed)

    # DOT tests with non-negative results require MRO review
    mro_required = test_info["mro_required"] or (simulated_result in ("positive", "dilute", "invalid"))
    mro_complete = not mro_required  # completed immediately if not needed

    # DOT compliance flags
    dot_flags = []
    if test_info["dot_regulated"]:
        if simulated_result in ("positive", "dilute") and not mro_complete:
            dot_flags.append("Non-negative result — MRO review required before finalizing")
        if simulated_result == "refused":
            dot_flags.append("Refusal to test treated as positive per DOT 49 CFR Part 40")

    collected_at = now + timedelta(hours=2)
    resulted_at = now + timedelta(hours=test_info["turnaround_hours"])
    collection_site = COLLECTION_SITES[body.candidateId % len(COLLECTION_SITES)]

    final_status = "pending_mro" if mro_required and not mro_complete else "resulted"

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO drug_tests (
                    candidate_id, test_type, status, result, mro_review_required, mro_review_complete,
                    chain_of_custody_id, collection_site, ordered_at, collected_at, resulted_at,
                    dot_compliance_flags
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                body.candidateId, body.testType, final_status, simulated_result,
                mro_required, mro_complete, coc_id,
                json.dumps(collection_site), now, collected_at, resulted_at,
                json.dumps(dot_flags)
            ))
            test_id = cur.fetchone()[0]

    return {
        "id": test_id,
        "candidateId": body.candidateId,
        "testType": body.testType,
        "testTypeLabel": test_info["label"],
        "status": final_status,
        "result": simulated_result,
        "mroReviewRequired": mro_required,
        "chainOfCustodyId": coc_id,
        "collectionSite": collection_site,
        "collectionSites": COLLECTION_SITES,
        "dotComplianceFlags": dot_flags,
        "orderedAt": now.isoformat(),
        "estimatedResultAt": resulted_at.isoformat(),
    }


@router.post("/{test_id}/mro-complete", status_code=200)
def complete_mro_review(test_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE drug_tests SET mro_review_complete = TRUE, status = 'resulted'
                WHERE id = %s RETURNING id
            """, (test_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Drug test not found")
    return {"status": "mro_complete", "testId": test_id}


@router.get("/candidate/{candidate_id}")
def get_candidate_drug_tests(candidate_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT dt.id, dt.candidate_id, c.name, dt.test_type, dt.status, dt.result,
                       dt.mro_review_required, dt.mro_review_complete, dt.chain_of_custody_id,
                       dt.collection_site, dt.ordered_at, dt.collected_at, dt.resulted_at,
                       dt.dot_compliance_flags
                FROM drug_tests dt
                JOIN candidates c ON c.id = dt.candidate_id
                WHERE dt.candidate_id = %s ORDER BY dt.ordered_at DESC
            """, (candidate_id,))
            return [row_to_drug_test(r) for r in cur.fetchall()]
