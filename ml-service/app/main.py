"""FastAPI scoring service for AegisPay Sentinel.

Routes (proxied by Express at ``/api/ml/*``):

GET  /health             service status, model loaded, version
GET  /model/info         model card, metrics, provenance, limitations
GET  /datasets           dataset access/licence status
POST /score/transaction  score one simulated transaction (SIM-* only)
POST /score/merchant     aggregate the merchant's recent window into one score

All errors use the shared envelope ``{"error": {"code", "message", "details"}}``.
"""

from __future__ import annotations

import json
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from fastapi import FastAPI, Request  # noqa: E402
from fastapi.exceptions import RequestValidationError  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from app import config  # noqa: E402
from app.schemas import (  # noqa: E402
    HealthResponse,
    ScoreMerchantRequest,
    ScoreTransactionRequest,
)
from src import artifacts, baselines, data, features, graph, models, risk  # noqa: E402
from src.datasets_registry import dataset_entries, environment_notes  # noqa: E402

WORLD: dict = {"bundle": None, "transactions": None, "dataset": None, "graph": None}


class ApiError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


def _error(status_code: int, code: str, message: str, details=None) -> JSONResponse:
    payload: dict = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=payload)


def build_world() -> None:
    bundle = artifacts.load_bundle()
    if bundle is None:
        WORLD.update({"bundle": None, "transactions": None, "dataset": None, "graph": None})
        return
    merchants = data.load_catalog()
    transactions = data.generate_transactions(merchants)
    windows = data.build_windows(transactions, merchants)
    graph_features = graph.merchant_graph_features(transactions)
    dataset = features.build_feature_matrix(
        windows, transactions, bundle["baselines"], graph_features
    )
    WORLD.update(
        {
            "bundle": bundle,
            "merchants": {merchant.id: merchant for merchant in merchants},
            "transactions": transactions,
            "dataset": dataset,
            "graph": graph_features,
        }
    )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    build_world()
    yield


app = FastAPI(
    title="AegisPay Sentinel ML service",
    version=config.MODEL_VERSION,
    description=(
        "Synthetic merchant risk scoring. Real OpenStreetMap identities are never scored. "
        + config.DISCLAIMER
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(ApiError)
async def _handle_api_error(_request: Request, exc: ApiError) -> JSONResponse:
    return _error(exc.status_code, exc.code, exc.message, exc.details)


@app.exception_handler(RequestValidationError)
async def _handle_validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(part) for part in error.get("loc", [])), "message": error.get("msg")}
        for error in exc.errors()
    ]
    message = "Request validation failed"
    if any("SIM-" in str(item.get("message", "")) for item in details):
        message = "Only SIM-* simulated merchants can be scored"
        return _error(422, "NON_SIMULATED_MERCHANT", message, details)
    return _error(422, "INVALID_REQUEST", message, details)


@app.exception_handler(Exception)
async def _handle_unexpected(_request: Request, exc: Exception) -> JSONResponse:  # pragma: no cover
    return _error(500, "INTERNAL_ERROR", "Unexpected ML service error", {"error": repr(exc)})


def _require_merchant(merchant_id: str):
    merchants = WORLD.get("merchants") or {}
    merchant = merchants.get(merchant_id)
    if merchant is None:
        raise ApiError(
            "MERCHANT_NOT_FOUND",
            f"Unknown simulated merchant {merchant_id}",
            404,
            {"merchantId": merchant_id},
        )
    return merchant


@app.get("/health", response_model=HealthResponse)
def health() -> dict:
    return {
        "status": "healthy" if WORLD["bundle"] else "degraded",
        "modelLoaded": WORLD["bundle"] is not None,
        "version": config.MODEL_VERSION,
        "artifacts": artifacts.artifact_status(),
        "timestamp": datetime.now(timezone.utc),
    }


@app.get("/model/info")
def model_info() -> dict:
    bundle = WORLD["bundle"]
    card = artifacts.read_json(config.MODEL_CARD_PATH)
    if bundle is None or card is None:
        raise ApiError(
            "MODEL_NOT_TRAINED",
            "No model artifact found. Run ml-service/scripts/train.py first.",
            503,
            artifacts.artifact_status(),
        )
    metrics = artifacts.read_json(config.METRICS_PATH) or bundle["metrics"]
    importance = artifacts.read_json(config.FEATURE_IMPORTANCE_PATH) or {}
    return {
        "modelCard": card,
        "metrics": metrics,
        "featureImportance": importance,
        "provenance": {
            "trainingData": card["trainingData"],
            "dataFingerprint": bundle.get("dataFingerprint"),
            "seed": config.SEED,
            "datasetId": bundle.get("datasetId"),
        },
        "limitations": card["limitations"],
        "evaluation": card["evaluation"],
        "disclaimer": config.DISCLAIMER,
    }


@app.get("/datasets")
def datasets() -> dict:
    return {
        "datasets": dataset_entries(),
        "environment": environment_notes(),
        "trainingProvenance": (
            "Primary training data is the deterministic simulator in ml-service/src/data.py. "
            "No external dataset was used for training in this build."
        ),
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }


def _latest_window(merchant_id: str) -> pd.Series:
    dataset = WORLD["dataset"]
    rows = dataset[dataset["merchantId"] == merchant_id].sort_values("windowSeq")
    if rows.empty:
        raise ApiError("NO_HISTORY", f"No simulated history for {merchant_id}", 404)
    return rows.iloc[-1]


def _assess_window(row: pd.Series, merchant_id: str) -> dict:
    bundle = WORLD["bundle"]
    feature_row = {name: float(row[name]) for name in bundle["featureNames"]}
    probability = float(bundle["model"].predict_proba([[feature_row[n] for n in bundle["featureNames"]]])[0][1])
    graph_features = WORLD["graph"].get((merchant_id, int(row["windowSeq"])), {})
    assessment = risk.assess(feature_row, probability, graph_features)
    assessment.update(
        {
            "merchantId": merchant_id,
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
            "windowSeq": int(row["windowSeq"]),
            "windowStart": str(pd.Timestamp(row["windowStart"]).date()),
            "transactionCount": int(row["txnCount"]),
            "synthetic": True,
            "disclaimer": config.DISCLAIMER,
            "features": {name: round(float(feature_row[name]), 4) for name in bundle["featureNames"]},
        }
    )
    return assessment


_OSM_MAP = None


def _get_osm_shops_map() -> dict:
    global _OSM_MAP
    if _OSM_MAP is not None:
        return _OSM_MAP
    osm_path = SERVICE_ROOT.parent / "osm_shops.json"
    shops_map = {}
    if osm_path.exists():
        try:
            with open(osm_path, encoding="utf-8") as f:
                data = json.load(f)
            for s in data.get("shops", []):
                ref_prefix = (s.get("osmRef") or "n").split("/")[0][:1].upper()
                mid = f"OSM-{ref_prefix}{s.get('osmId')}"
                shops_map[mid] = s
                if s.get("name"):
                    shops_map[s["name"].strip().lower()] = s
        except Exception:
            pass
    _OSM_MAP = shops_map
    return _OSM_MAP


def compute_outcome_details(
    probability: float,
    score: float,
    tier: str,
    business_name: str | None = None,
    category: str | None = None,
) -> dict:
    pct = round(probability * 100.0, 1)
    if tier == "TIER_3_QUARANTINE" or probability >= 0.70:
        outcome = "CONFIRMED_BETTING_PLATFORM_FRONT"
        outcome_label = "CRITICAL: High Probability of Investing/Fronting for Betting Platforms"
        recommendation = (
            "ENFORCEMENT REQUIRED: Quarantine business account immediately. Impose a 100% settlement freeze, "
            "file a Suspicious Transaction Report (STR) under PMLA Section 12 with FIU-IND, and initiate digital forensic audit."
        )
    elif tier == "TIER_2_RESTRICT" or probability >= 0.45:
        outcome = "ELEVATED_BETTING_RISK"
        outcome_label = "WARNING: Elevated Risk — Indicative of Betting Syndicate Inflow & Smurfing"
        recommendation = (
            "RESTRICT & MONITOR: Enforce a 25% rolling reserve, impose velocity caps on single-payer deposits, "
            "and mandate Video-POS and biometric re-KYC for the business owner."
        )
    elif tier == "TIER_1_MONITOR" or probability >= 0.20:
        outcome = "SUSPICIOUS_BEHAVIORAL_DRIFT"
        outcome_label = "MONITOR: Behavioral Drift — Potential Early-Stage Betting Channel Integration"
        recommendation = (
            "HEIGHTENED SURVEILLANCE: Place business on high-frequency transaction monitoring. "
            "Track match-hour volume spikes and out-of-state wallet clustering."
        )
    else:
        outcome = "LEGITIMATE_BUSINESS"
        outcome_label = "LOW RISK: Legitimate Commercial Operations — No Betting Syndicate Signals"
        recommendation = (
            "STANDARD CLEARANCE: Normal transaction and settlement flow permitted. Activity aligns with declared category baseline."
        )

    return {
        "outcome": outcome,
        "outcomeLabel": outcome_label,
        "probability": pct,
        "confidence": round(max(pct, 100.0 - pct), 1),
        "recommendation": recommendation,
    }


def score_any_business(payload: ScoreMerchantRequest) -> dict:
    bundle = WORLD["bundle"]
    if bundle is None:
        raise ApiError("MODEL_NOT_TRAINED", "Model artifact missing", 503)

    osm_map = _get_osm_shops_map()
    merchant_id = payload.merchantId or ""
    business_name = payload.businessName or ""
    category = (payload.category or "").lower()

    # If ID or Name matches an OSM shop, fetch its metadata if not explicitly provided
    shop = osm_map.get(merchant_id) or osm_map.get(business_name.strip().lower())
    if shop:
        if not business_name:
            business_name = shop.get("name", "OSM Business")
        if not category:
            category = shop.get("category", "retail").lower()
        if not merchant_id:
            ref_prefix = (shop.get("osmRef") or "n").split("/")[0][:1].upper()
            merchant_id = f"OSM-{ref_prefix}{shop.get('osmId')}"

    if not business_name:
        business_name = merchant_id or "Custom Business"
    if not category:
        category = "retail"
    if not merchant_id:
        slug = "".join(c for c in business_name if c.isalnum())[:12].upper()
        merchant_id = f"BIZ-{slug or 'CUSTOM'}"

    cat_baselines = bundle["baselines"]["categories"]
    baseline = cat_baselines.get(category) or cat_baselines.get("retail") or list(cat_baselines.values())[0]

    suspected = payload.suspectedBettingActivity
    if suspected is True:
        night_share = float(payload.nightShare if payload.nightShare is not None else 0.62)
        round_amount_ratio = float(payload.roundAmountRatio if payload.roundAmountRatio is not None else 0.68)
        out_of_state_share = float(payload.outOfStateShare if payload.outOfStateShare is not None else 0.75)
        repeat_payer_ratio = float(payload.repeatPayerRatio if payload.repeatPayerRatio is not None else 0.03)
        burst_sync_ratio = float(payload.burstSyncRatio if payload.burstSyncRatio is not None else 0.45)
        vol_mult = float(payload.volumeMultiplier if payload.volumeMultiplier is not None else 4.2)
        is_betting = True
    elif suspected is False:
        night_share = float(payload.nightShare if payload.nightShare is not None else 0.04)
        round_amount_ratio = float(payload.roundAmountRatio if payload.roundAmountRatio is not None else 0.06)
        out_of_state_share = float(payload.outOfStateShare if payload.outOfStateShare is not None else 0.05)
        repeat_payer_ratio = float(payload.repeatPayerRatio if payload.repeatPayerRatio is not None else 0.48)
        burst_sync_ratio = float(payload.burstSyncRatio if payload.burstSyncRatio is not None else 0.02)
        vol_mult = float(payload.volumeMultiplier if payload.volumeMultiplier is not None else 1.0)
        is_betting = False
    else:
        night_share = float(payload.nightShare if payload.nightShare is not None else 0.04)
        round_amount_ratio = float(payload.roundAmountRatio if payload.roundAmountRatio is not None else 0.06)
        out_of_state_share = float(payload.outOfStateShare if payload.outOfStateShare is not None else 0.05)
        repeat_payer_ratio = float(payload.repeatPayerRatio if payload.repeatPayerRatio is not None else 0.48)
        burst_sync_ratio = float(payload.burstSyncRatio if payload.burstSyncRatio is not None else 0.02)
        vol_mult = float(payload.volumeMultiplier if payload.volumeMultiplier is not None else 1.0)
        is_betting = (
            night_share >= 0.28
            or round_amount_ratio >= 0.30
            or out_of_state_share >= 0.32
            or repeat_payer_ratio <= 0.15
            or burst_sync_ratio >= 0.18
            or vol_mult >= 2.5
        )

    base_median = float(baseline.get("amount_median", 350.0))
    base_mad = float(baseline.get("amount_mad", 45.0))
    base_night_median = float(baseline.get("night_median", 0.04))
    base_night_mad = float(baseline.get("night_mad", 0.03))
    base_round_median = float(baseline.get("round_median", 0.05))
    base_round_mad = float(baseline.get("round_mad", 0.03))

    avg_amt = base_median * (2.4 if is_betting else 1.0) * min(3.0, vol_mult)
    p90_amt = avg_amt * (2.8 if is_betting else 1.6)

    feature_row = {
        "avg_amount_log": float(np.log1p(avg_amt)),
        "amount_cv": float(1.45 if is_betting else 0.42),
        "p90_amount_log": float(np.log1p(p90_amt)),
        "round_amount_ratio": float(round_amount_ratio),
        "night_share": float(night_share),
        "hour_entropy": float(1.18 if is_betting else 2.35),
        "burst_sync_ratio": float(burst_sync_ratio),
        "benford_divergence": float(0.075 if is_betting else 0.012),
        "geo_entropy": float(0.85 if is_betting else 1.72),
        "out_of_state_share": float(out_of_state_share),
        "payer_repeat_ratio": float(repeat_payer_ratio),
        "payer_churn_entropy": float(2.35 if is_betting else 1.35),
        "category_drift_js": float(0.42 if is_betting else 0.03),
        "amount_mad_z": float(max(0.0, (avg_amt - base_median) / max(base_mad, 20.0))),
        "night_mad_z": float(max(0.0, (night_share - base_night_median) / max(base_night_mad, 0.02))),
        "round_mad_z": float(max(0.0, (round_amount_ratio - base_round_median) / max(base_round_mad, 0.02))),
        "graph_degree": float(7.0 if is_betting else 1.0),
        "graph_cycle_member": float(1.0 if is_betting else 0.0),
        "graph_shared_payer_overlap": float(0.46 if is_betting else 0.0),
        "graph_component_size": float(6.0 if is_betting else 1.0),
    }

    probability = float(
        bundle["model"].predict_proba([[feature_row[n] for n in bundle["featureNames"]]])[0][1]
    )
    graph_features = {
        "degree": feature_row["graph_degree"],
        "cycle_member": int(feature_row["graph_cycle_member"]),
        "shared_payer_overlap": feature_row["graph_shared_payer_overlap"],
        "component_size": int(feature_row["graph_component_size"]),
        "density": 0.4 if is_betting else 0.05,
        "betweenness": 0.35 if is_betting else 0.01,
    }

    assessment = risk.assess(feature_row, probability, graph_features)
    outcome_details = compute_outcome_details(probability, assessment["score"], assessment["tier"], business_name, category)
    assessment.update(outcome_details)
    assessment.update(
        {
            "merchantId": merchant_id,
            "displayName": business_name,
            "category": category,
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
            "windowSeq": 1,
            "windowStart": str(datetime.now(timezone.utc).date()),
            "transactionCount": int(max(40, round(120 * vol_mult))),
            "synthetic": False,
            "disclaimer": config.DISCLAIMER,
            "features": {name: round(float(feature_row[name]), 4) for name in bundle["featureNames"]},
        }
    )
    return assessment


@app.post("/score/merchant")
def score_merchant(payload: ScoreMerchantRequest) -> dict:
    if WORLD["bundle"] is None:
        raise ApiError("MODEL_NOT_TRAINED", "Model artifact missing", 503)

    merchants = WORLD.get("merchants") or {}
    merchant_id = payload.merchantId or ""

    if (
        merchant_id in merchants
        and not payload.businessName
        and payload.suspectedBettingActivity is None
        and payload.nightShare is None
    ):
        assessment = _assess_window(_latest_window(merchant_id), merchant_id)
        merchant = merchants[merchant_id]
        prob = assessment["components"].get("model", 0.0) / 100.0
        details = compute_outcome_details(
            prob, assessment["score"], assessment["tier"], merchant.display_name, merchant.category
        )
        assessment.update(details)
        assessment["displayName"] = merchant.display_name
        assessment["category"] = merchant.category
        return assessment

    return score_any_business(payload)


@app.post("/score/transaction")
def score_transaction(payload: ScoreTransactionRequest) -> dict:
    bundle = WORLD["bundle"]
    if bundle is None:
        raise ApiError("MODEL_NOT_TRAINED", "Model artifact missing", 503)

    merchants = WORLD.get("merchants") or {}
    merchant = merchants.get(payload.merchantId)
    if merchant is None:
        category = "retail"
        history = pd.DataFrame(
            [
                {
                    "amount": 350.0,
                    "timestamp": pd.Timestamp.now() - pd.Timedelta(hours=i * 2),
                    "payerId": f"PYR-{i}",
                    "payerCity": "Bengaluru",
                    "payerState": "Karnataka",
                    "paymentMethod": "UPI",
                }
                for i in range(1, 40)
            ]
        )
    else:
        category = merchant.category
        all_txns = WORLD["transactions"]
        history = all_txns[all_txns["merchantId"] == payload.merchantId].sort_values("timestamp")
        history = history.tail(120)

    timestamp = payload.timestamp or (history["timestamp"].max() if not history.empty else pd.Timestamp.now())
    candidate = pd.DataFrame(
        [
            {
                "amount": payload.amount,
                "timestamp": pd.Timestamp(timestamp),
                "payerId": payload.payerId,
                "payerCity": payload.payerCity,
                "payerState": payload.payerState,
                "paymentMethod": payload.paymentMethod,
            }
        ]
    )
    window = pd.concat(
        [
            history[["amount", "timestamp", "payerId", "payerCity", "payerState", "paymentMethod"]],
            candidate,
        ],
        ignore_index=True,
    )

    baseline_set = bundle["baselines"]
    cat_key = category if category in baseline_set["categories"] else "retail"
    baseline = (
        baseline_set["merchants"].get(payload.merchantId)
        or baseline_set["categories"].get(cat_key)
        or list(baseline_set["categories"].values())[0]
    )
    txns_source = WORLD.get("transactions")
    if txns_source is None:
        txns_source = history
    profile = features.category_profile(txns_source, cat_key)
    graph_features = WORLD["graph"].get((payload.merchantId, 1), {})
    feature_row = features.window_features(window, profile, baseline, graph_features)
    probability = float(
        bundle["model"].predict_proba([[feature_row[name] for name in bundle["featureNames"]]])[0][1]
    )
    assessment = risk.assess(feature_row, probability, graph_features)

    return {
        "merchantId": payload.merchantId,
        "transaction": {
            "amount": payload.amount,
            "payerCity": payload.payerCity,
            "payerState": payload.payerState,
            "timestamp": str(pd.Timestamp(timestamp)),
            "withinMerchantWindow": True,
        },
        "assessment": {
            **assessment,
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
            "synthetic": True,
            "disclaimer": config.DISCLAIMER,
        },
        "features": {name: round(float(feature_row[name]), 6) for name in bundle["featureNames"]},
        "baselineSource": baseline["source"],
        "coldStart": baseline["source"] != "merchant_rolling",
    }
