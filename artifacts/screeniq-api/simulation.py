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

    # Confidence score: higher for clear/confirmed, lower for flags
    base_confidence = 0.92 if status in ("clear", "confirmed", "clean") else 0.74
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


def simulate_all_checks(candidate_name: str, check_types: list[str] | None = None) -> list[dict[str, Any]]:
    """Run all checks for a candidate."""
    types = check_types or ["criminal", "employment", "education", "driving"]
    return [simulate_check(candidate_name, ct) for ct in types]
