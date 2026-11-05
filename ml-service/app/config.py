"""Central configuration for the AegisPay Sentinel ML service.

Every path is resolved from this file's location so the service behaves the
same whether it is started from the repository root or from ``ml-service``.
No hardcoded absolute paths.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parent

ARTIFACT_DIR = SERVICE_ROOT / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "model.joblib"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"
MODEL_CARD_PATH = ARTIFACT_DIR / "model_card.json"
FEATURE_IMPORTANCE_PATH = ARTIFACT_DIR / "feature_importance.json"

# Single source of truth for simulated identities, shared with the Express API.
SIM_CATALOG_PATH = REPO_ROOT / "backend" / "src" / "data" / "simulated_merchants.json"
# Real OpenStreetMap identities (display only; never scored).
OSM_SHOPS_PATH = REPO_ROOT / "backend" / "src" / "data" / "osm_shops.json"
COFFEE_CSV_PATH = REPO_ROOT / "coffee_shop_transactions.csv"
EXTERNAL_DATA_DIR = SERVICE_ROOT / "data" / "external"

MODEL_VERSION = "1.0.0"
SEED = 20261104

# Observation window for the deterministic simulator. 90 days ending on the
# date below; windows of WINDOW_DAYS_AGG days are aggregated per merchant.
WINDOW_END = date(2026, 11, 3)
WINDOW_DAYS = 90
WINDOW_DAYS_AGG = 3
INJECTION_DAY = 55  # day index (0-based) at which drift/syndicate behaviour begins

# Massachusetts-style MCC rationale: 5814 is the card-acceptor category used by
# fast-food / coffee-shop merchants, so cafés are modelled on it.
CATEGORY_ORDER = [
    "bakery",
    "grocery",
    "restaurant",
    "cafe",
    "pharmacy",
    "clothing",
    "electronics",
    "convenience",
    "hotel",
]

CATEGORY_PROFILES: dict[str, dict] = {
    "bakery": {"ticket": 220, "sigma": 0.45, "daily": 9, "open": 7, "close": 21, "repeat": 0.42},
    "grocery": {"ticket": 620, "sigma": 0.55, "daily": 13, "open": 7, "close": 22, "repeat": 0.38},
    "restaurant": {"ticket": 780, "sigma": 0.6, "daily": 11, "open": 11, "close": 23, "repeat": 0.24},
    "cafe": {"ticket": 320, "sigma": 0.4, "daily": 8, "open": 8, "close": 22, "repeat": 0.35},
    "pharmacy": {"ticket": 460, "sigma": 0.65, "daily": 7, "open": 8, "close": 22, "repeat": 0.30},
    "clothing": {"ticket": 1900, "sigma": 0.7, "daily": 5, "open": 10, "close": 21, "repeat": 0.12},
    "electronics": {"ticket": 7200, "sigma": 0.85, "daily": 4, "open": 10, "close": 20, "repeat": 0.08},
    "convenience": {"ticket": 190, "sigma": 0.5, "daily": 15, "open": 6, "close": 24, "repeat": 0.44},
    "hotel": {"ticket": 5600, "sigma": 0.65, "daily": 5, "open": 0, "close": 24, "repeat": 0.05},
}

# Behaviour overlay for injected typologies (labels come from these parameters,
# never from computed features).
SCENARIO_DRIFT = {
    "daily_multiplier": 3.0,
    "night_start_hour": 22,
    "night_end_hour": 2,
    "round_amounts": [1000, 2500, 5000, 10000, 15000, 20000],
    "round_share": 0.85,
    "one_off_payer_share": 0.95,
    "out_of_state_share": 0.8,
}
SCENARIO_SYNDICATE = {
    **SCENARIO_DRIFT,
    "daily_multiplier": 3.5,
    "shared_payer_pool": True,
    "sync_window_minutes": 10,
}
SCENARIO_MONITOR = {"daily_multiplier": 1.4, "night_share": 0.12, "ticket_multiplier": 1.2}

# Adaptive baselines
BASELINE_WINDOW_DAYS = 30
MIN_BASELINE_TXNS = 40
MAD_SCALE = 1.4826

# Model / evaluation
TEST_MERCHANT_FRACTION = 0.3
TEST_TIME_FRACTION = 0.25
MIN_POSITIVES_FOR_AUC = 3

# Risk engine
RISK_WEIGHTS = {"rule": 0.35, "model": 0.45, "graph": 0.20}
TIER_THRESHOLDS = {"TIER_0_SAFE": 25.0, "TIER_1_MONITOR": 55.0, "TIER_2_RESTRICT": 80.0}
TOP_REASONS = 4

DISCLAIMER = (
    "Statistical triage on simulated data. Not a legal finding, not evidence of "
    "wrongdoing, and not validated on real betting-front cases. Real OpenStreetMap "
    "businesses are directory records only and are never scored."
)
