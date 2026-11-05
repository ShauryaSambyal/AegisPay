"""Artifact persistence: model bundle, metrics, model card, feature importance."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib

from app import config

_BUNDLE_CACHE: dict | None = None


def save_bundle(bundle: dict, path: Path | None = None) -> Path:
    target = Path(path) if path else config.MODEL_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, target)
    return target


def load_bundle(path: Path | None = None, use_cache: bool = True) -> dict | None:
    global _BUNDLE_CACHE
    if use_cache and _BUNDLE_CACHE is not None and path is None:
        return _BUNDLE_CACHE
    target = Path(path) if path else config.MODEL_PATH
    if not target.exists():
        return None
    bundle = joblib.load(target)
    if path is None and use_cache:
        _BUNDLE_CACHE = bundle
    return bundle


def _write_json(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False, sort_keys=False)
        handle.write("\n")
    return path


def save_metrics(metrics: dict, path: Path | None = None) -> Path:
    return _write_json(Path(path) if path else config.METRICS_PATH, metrics)


def save_importance(importance: dict, path: Path | None = None) -> Path:
    return _write_json(Path(path) if path else config.FEATURE_IMPORTANCE_PATH, importance)


def build_model_card(bundle: dict, dataset_summary: dict, datasets: list[dict]) -> dict:
    metrics = bundle["metrics"]
    return {
        "name": "AegisPay Sentinel merchant risk model",
        "version": config.MODEL_VERSION,
        "trainedAt": bundle["trainedAt"],
        "seed": config.SEED,
        "modelType": metrics["model"],
        "calibration": metrics["calibration"],
        "featureNames": bundle["featureNames"],
        "featureCount": len(bundle["featureNames"]),
        "windowDays": metrics["windowDays"],
        "trainingData": {
            "primary": "Deterministic simulated SIM-* transactions (src/data.py)",
            "auxiliary": "coffee_shop_transactions.csv basket composition for café amounts (assumed unit prices)",
            "externalDatasetsUsedForTraining": [],
            "externalDatasetsInspected": [entry["name"] for entry in datasets],
            "provenance": "synthetic",
            "realOsmRecordsUsed": False,
        },
        "datasetSummary": dataset_summary,
        "metrics": {
            "timeHoldout": metrics["splits"]["time_holdout"],
            "merchantHoldout": metrics["splits"]["merchant_holdout"],
            "operatingThreshold": metrics["operatingThreshold"],
        },
        "evaluation": "synthetic_evaluation",
        "syntheticDataWarning": (
            "Metrics are computed on synthetic simulated windows. They measure separation of "
            "injected typologies from the simulated normal population and must not be read as "
            "real-world detection accuracy."
        ),
        "limitations": [
            "Trained and evaluated entirely on synthetic SIM-* data; no real fraud or betting labels were used.",
            "Merchant holdout slices can contain too few positive windows for a stable AUC; such metrics are reported as null.",
            "The rule layer and the graph layer share simulated payer identifiers, so their signal is cleaner than production payment data.",
            "No production calibration: the operating threshold is derived from the training slice (75th percentile of scores).",
            "Real OpenStreetMap businesses are never scored by this model.",
        ],
        "intendedUse": "Research/demo triage assistance inside the AegisPay Sentinel demo environment.",
        "outOfScopeUse": "Legal findings, regulatory filings, or automated adverse action against any real merchant.",
    }


def save_model_card(card: dict, path: Path | None = None) -> Path:
    return _write_json(Path(path) if path else config.MODEL_CARD_PATH, card)


def read_json(path: Path) -> dict | None:
    if not Path(path).exists():
        return None
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def artifact_status() -> dict:
    return {
        "model": config.MODEL_PATH.exists(),
        "metrics": config.METRICS_PATH.exists(),
        "modelCard": config.MODEL_CARD_PATH.exists(),
        "featureImportance": config.FEATURE_IMPORTANCE_PATH.exists(),
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }
