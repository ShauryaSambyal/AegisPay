"""Train the merchant risk model and write all artifacts.

Usage (from the repository root):
    .\\ml-service\\.venv\\Scripts\\python.exe ml-service\\scripts\\train.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app import config  # noqa: E402
from src import artifacts, baselines, data, features, graph, models  # noqa: E402


def dataset_summary(transactions, windows, dataset) -> dict:
    return {
        "transactions": int(len(transactions)),
        "merchants": int(transactions["merchantId"].nunique()),
        "windowRows": int(len(windows)),
        "featureRows": int(len(dataset)),
        "positives": int(dataset["label"].sum()),
        "negatives": int((dataset["label"] == 0).sum()),
        "injectionDay": config.INJECTION_DAY,
        "observationDays": config.WINDOW_DAYS,
        "windowDays": config.WINDOW_DAYS_AGG,
        "allMerchantsSimulated": bool(
            transactions["merchantId"].str.startswith("SIM-").all()
        ),
        "labelSource": "scenario parameters (normal|drift|syndicate) + fixed injection day",
    }


def main() -> int:
    merchants = data.load_catalog()
    transactions = data.generate_transactions(merchants)
    fingerprint = data.deterministic_fingerprint(transactions)
    print(f"[train] transactions={len(transactions)} merchants={len(merchants)} fingerprint={fingerprint[:16]}")

    windows = data.build_windows(transactions, merchants)
    temporal_cutoff = transactions["timestamp"].min() + (
        transactions["timestamp"].max() - transactions["timestamp"].min()
    ) * (1 - config.TEST_TIME_FRACTION)
    baseline_set = baselines.build_baselines(transactions, temporal_cutoff)
    graph_features = graph.merchant_graph_features(transactions)
    dataset = features.build_feature_matrix(windows, transactions, baseline_set, graph_features)

    bundle = models.train_bundle(dataset, transactions, baseline_set)
    bundle["dataFingerprint"] = fingerprint
    bundle["temporalCutoff"] = str(temporal_cutoff)
    bundle["datasetId"] = f"sim-{config.SEED}"

    artifacts.save_bundle(bundle)
    artifacts.save_metrics(bundle["metrics"])
    artifacts.save_importance(bundle["importance"])

    from src.datasets_registry import dataset_entries

    card = artifacts.build_model_card(
        bundle,
        dataset_summary(transactions, windows, dataset),
        dataset_entries(),
    )
    artifacts.save_model_card(card)

    print("[train] artifacts written:")
    print(f"  model            {config.MODEL_PATH} ({config.MODEL_PATH.stat().st_size / 1024:.1f} KiB)")
    print(f"  metrics          {config.METRICS_PATH}")
    print(f"  model card       {config.MODEL_CARD_PATH}")
    print(f"  importance       {config.FEATURE_IMPORTANCE_PATH}")
    print(json.dumps(card["metrics"], indent=2)[:1200])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
