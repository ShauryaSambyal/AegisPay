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

import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

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
        }
    )
    return assessment


@app.post("/score/merchant")
def score_merchant(payload: ScoreMerchantRequest) -> dict:
    _require_merchant(payload.merchantId)
    if WORLD["bundle"] is None:
        raise ApiError("MODEL_NOT_TRAINED", "Model artifact missing", 503)
    return _assess_window(_latest_window(payload.merchantId), payload.merchantId)


@app.post("/score/transaction")
def score_transaction(payload: ScoreTransactionRequest) -> dict:
    merchant = _require_merchant(payload.merchantId)
    bundle = WORLD["bundle"]
    if bundle is None:
        raise ApiError("MODEL_NOT_TRAINED", "Model artifact missing", 503)

    transactions = WORLD["transactions"]
    history = transactions[transactions["merchantId"] == payload.merchantId].sort_values("timestamp")
    history = history.tail(120)

    timestamp = payload.timestamp or history["timestamp"].max()
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
    baseline = baseline_set["merchants"].get(payload.merchantId) or baseline_set["categories"][
        merchant.category
    ]
    profile = features.category_profile(transactions, merchant.category)
    graph_features = WORLD["graph"].get((payload.merchantId, int(_latest_window(payload.merchantId)["windowSeq"])), {})
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
