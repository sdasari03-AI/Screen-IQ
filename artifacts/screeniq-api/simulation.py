"""
Deterministic background check simulation engine.
Results are driven by the candidate name hash for consistency,
but seeded with a random component to add realistic variance.
"""
import hashlib
import random
import time
from typing import Any

CHECK_CONFIGS = {
    "criminal": {
        "data_source": "National Criminal Database (NCDB)",
        "statuses": ["clear", "flag", "review"],
        "status_labels": {
            "clear": "Clear",
            "flag": "Record Found",
            "review": "Pending Manual Review",
        },
        "weights": [0.72, 0.15, 0.13],
        "base_processing_ms": 1200,
    },
    "employment": {
        "data_source": "Employment Verification Network (EVN)",
        "statuses": ["confirmed", "unverified", "discrepancy"],
        "status_labels": {
            "confirmed": "Confirmed",
            "unverified": "Unverified",
            "discrepancy": "Discrepancy Found",
        },
        "weights": [0.68, 0.20, 0.12],
        "base_processing_ms": 2800,
    },
    "education": {
        "data_source": "Education Records Clearinghouse (ERC)",
        "statuses": ["confirmed", "unverified"],
        "status_labels": {
            "confirmed": "Verified",
            "unverified": "Unable to Verify",
        },
        "weights": [0.78, 0.22],
        "base_processing_ms": 900,
    },
    "driving": {
        "data_source": "State DMV Records",
        "statuses": ["clean", "violations", "suspended"],
        "status_labels": {
            "clean": "Clean Record",
            "violations": "Violations Noted",
            "suspended": "License Suspended",
        },
        "weights": [0.65, 0.28, 0.07],
        "base_processing_ms": 600,
    },
    # ── New check types ─────────────────────────────────────────────
    "drug_health": {
        "data_source": "Occupational Health & Drug Testing Network (OHDTN)",
        "statuses": ["negative", "positive", "awaiting_collection", "inconclusive"],
        "status_labels": {
            "negative": "Negative — Clear",
            "positive": "Positive — Further Review Required",
            "awaiting_collection": "Awaiting Specimen Collection",
            "inconclusive": "Inconclusive — Retest Ordered",
        },
        "weights": [0.74, 0.08, 0.12, 0.06],
        "base_processing_ms": 3800,
    },
    "credit": {
        "data_source": "TransUnion Consumer Credit Bureau",
        "statuses": ["clear", "flag", "review"],
        "status_labels": {
            "clear": "Acceptable Credit Profile",
            "flag": "Derogatory Marks Found",
            "review": "Manual Review — Borderline Profile",
        },
        "weights": [0.62, 0.24, 0.14],
        "base_processing_ms": 1100,
    },
    "eviction": {
        "data_source": "National Eviction Records Database (NERD)",
        "statuses": ["clear", "flag"],
        "status_labels": {
            "clear": "No Eviction Records Found",
            "flag": "Eviction Record Found",
        },
        "weights": [0.81, 0.19],
        "base_processing_ms": 850,
    },
}

CHECK_DETAILS = {
    "criminal": {
        "clear": {
            "records_searched": "Federal, State, County courts (7 years)",
            "jurisdictions_checked": 47,
            "sex_offender_registry": "Clear",
            "global_watchlist": "Clear",
        },
        "flag": {
            "records_searched": "Federal, State, County courts (7 years)",
            "offense_type": "Misdemeanor",
            "offense_date": "2019-03-12",
            "disposition": "Probation",
            "jurisdiction": "Travis County, TX",
        },
        "review": {
            "records_searched": "Federal, State, County courts (7 years)",
            "note": "Possible record found — manual review initiated",
            "estimated_resolution": "1-2 business days",
        },
    },
    "employment": {
        "confirmed": {
            "employer": "Previous Employer Verified",
            "dates_verified": True,
            "title_verified": True,
            "rehire_eligible": True,
            "years_verified": 3,
        },
        "unverified": {
            "employer": "Unable to reach employer",
            "attempts": 3,
            "reason": "Business closed / not responding",
        },
        "discrepancy": {
            "reported_title": "Senior Manager",
            "verified_title": "Associate",
            "reported_end_date": "2022-06-01",
            "verified_end_date": "2021-11-15",
        },
    },
    "education": {
        "confirmed": {
            "institution": "Degree-granting institution verified",
            "degree_verified": True,
            "graduation_year_verified": True,
        },
        "unverified": {
            "institution": "Claim could not be verified",
            "reason": "No enrollment record found",
        },
    },
    "driving": {
        "clean": {
            "license_status": "Valid",
            "violations_7yr": 0,
            "accidents_7yr": 0,
            "dui": False,
        },
        "violations": {
            "license_status": "Valid",
            "violations_7yr": 2,
            "violation_types": ["Speeding (15+ over)", "Failure to stop"],
            "accidents_7yr": 1,
            "dui": False,
        },
        "suspended": {
            "license_status": "Suspended",
            "suspension_reason": "Unpaid fines",
            "reinstatement_date": "Pending",
            "dui": False,
        },
    },
    "drug_health": {
        "negative": {
            "panel": "10-Panel Urine Screen",
            "collection_site": "AFC Urgent Care — Austin, TX",
            "collection_date": "2024-01-10",
            "lab": "Quest Diagnostics",
            "substances_tested": ["THC", "Cocaine", "Amphetamines", "Opioids", "PCP", "Benzodiazepines", "Barbiturates", "Propoxyphene", "Methadone", "Methaqualone"],
            "mro_reviewed": True,
        },
        "positive": {
            "panel": "10-Panel Urine Screen",
            "collection_site": "LabCorp — Dallas, TX",
            "collection_date": "2024-01-10",
            "lab": "LabCorp",
            "substance_detected": "Amphetamines",
            "mro_reviewed": True,
            "mro_determination": "Positive — No valid prescription on file",
            "retest_available": True,
        },
        "awaiting_collection": {
            "panel": "10-Panel Urine Screen",
            "collection_order_sent": "2024-01-10",
            "collection_deadline": "2024-01-15",
            "collection_sites_available": 3,
            "reminder_sent": True,
        },
        "inconclusive": {
            "panel": "10-Panel Urine Screen",
            "reason": "Specimen validity test failed — dilute specimen",
            "retest_ordered": True,
            "retest_deadline": "2024-01-17",
        },
    },
    "credit": {
        "clear": {
            "credit_score_range": "720-759 (Good)",
            "derogatory_marks": 0,
            "public_records": 0,
            "collections": 0,
            "debt_to_income_flag": False,
            "bankruptcies_7yr": 0,
        },
        "flag": {
            "credit_score_range": "580-619 (Fair/Poor)",
            "derogatory_marks": 3,
            "public_records": 1,
            "collections": 2,
            "debt_to_income_flag": True,
            "bankruptcies_7yr": 1,
            "most_recent_derogatory": "2022-08-15",
        },
        "review": {
            "credit_score_range": "640-679 (Fair)",
            "derogatory_marks": 1,
            "public_records": 0,
            "collections": 1,
            "debt_to_income_flag": False,
            "bankruptcies_7yr": 0,
            "note": "Borderline profile — recommend position-sensitivity review",
        },
    },
    "eviction": {
        "clear": {
            "records_searched": "National + State eviction databases (7 years)",
            "states_searched": 50,
            "unlawful_detainers": 0,
            "judgments": 0,
        },
        "flag": {
            "records_searched": "National + State eviction databases (7 years)",
            "eviction_date": "2021-04-22",
            "county": "Cook County, IL",
            "plaintiff": "Midwest Property Management LLC",
            "judgment_amount": "$3,240",
            "outcome": "Judgment for plaintiff",
        },
    },
}

# Default check packages by screening type
SCREENING_PACKAGES = {
    "employment": ["criminal", "employment", "education", "driving"],
    "tenant": ["criminal", "credit", "eviction"],
}


def _seed_for_candidate(candidate_name: str, check_type: str) -> int:
    h = hashlib.md5(f"{candidate_name.lower()}-{check_type}".encode()).hexdigest()
    return int(h[:8], 16)


def simulate_check(candidate_name: str, check_type: str) -> dict[str, Any]:
    """Run a simulated background check for a given candidate and check type."""
    cfg = CHECK_CONFIGS[check_type]
    rng = random.Random(_seed_for_candidate(candidate_name, check_type))

    status = rng.choices(cfg["statuses"], weights=cfg["weights"], k=1)[0]
    status_label = cfg["status_labels"][status]
    data_source = cfg["data_source"]

    # Confidence score: higher for clear/confirmed/negative, lower for flags
    clear_statuses = ("clear", "confirmed", "clean", "negative")
    base_confidence = 0.92 if status in clear_statuses else 0.74
    confidence = round(min(0.99, max(0.55, base_confidence + rng.uniform(-0.08, 0.06))), 2)

    # Processing time in ms with some variance
    processing_ms = int(cfg["base_processing_ms"] + rng.randint(-300, 600))

    details = CHECK_DETAILS.get(check_type, {}).get(status, {})

    return {
        "check_type": check_type,
        "status": status,
        "status_label": status_label,
        "data_source": data_source,
        "confidence_score": float(confidence),
        "processing_time_ms": processing_ms,
        "details": details,
    }


def simulate_all_checks(
    candidate_name: str,
    check_types: list[str] | None = None,
    screening_type: str = "employment",
) -> list[dict[str, Any]]:
    """Run all checks for a candidate using the appropriate package."""
    if check_types:
        types = check_types
    else:
        types = SCREENING_PACKAGES.get(screening_type, SCREENING_PACKAGES["employment"])
    return [simulate_check(candidate_name, ct) for ct in types if ct in CHECK_CONFIGS]
