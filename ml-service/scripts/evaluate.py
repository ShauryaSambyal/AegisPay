"""Evaluate a saved bundle on the deterministic splits and print measured metrics.

Usage (from the repository root):
    .\\ml-service\\.venv\\Scripts\\python.exe ml-service\\scripts\\evaluate.py
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


def main() -> int:
    bundle = artifacts.load_bundle(use_cache=False)
    if bundle is None:
        print(f"[evaluate] no bundle at {config.MODEL_PATH}; run scripts/train.py first")
        return 1

    merchants = data.load_catalog()
    transactions = data.generate_transactions(merchants)
    windows = data.build_windows(transactions, merchants)
    cutoff = transactions["timestamp"].min() + (
        transactions["timestamp"].max() - transactions["timestamp"].min()
    ) * (1 - config.TEST_TIME_FRACTION)
    baseline_set = baselines.build_baselines(transactions, cutoff)
    graph_features = graph.merchant_graph_features(transactions)
    dataset = features.build_feature_matrix(windows, transactions, baseline_set, graph_features)

    cutoff_seq = bundle["metrics"]["temporalCutoffWindowSeq"]
    train_merchants = set(bundle["trainMerchants"])
    holdout = set(bundle["holdoutMerchants"])

    time_holdout = dataset[
        dataset["merchantId"].isin(train_merchants) & (dataset["windowSeq"] >= cutoff_seq)
    ]
    merchant_holdout = dataset[dataset["merchantId"].isin(holdout)]

    report = {
        "bundleVersion": bundle["metrics"]["modelVersion"],
        "seed": bundle["metrics"]["seed"],
        "dataFingerprint": bundle.get("dataFingerprint"),
        "timeHoldout": models.evaluate(bundle["model"], time_holdout, "time_holdout"),
        "merchantHoldout": models.evaluate(bundle["model"], merchant_holdout, "merchant_holdout"),
    }
    print(json.dumps(report, indent=2))

    stored = artifacts.read_json(config.METRICS_PATH) or {}
    if stored.get("seed") == report["seed"]:
        print("\n[compare] stored metrics seed matches the current seed")
        for name in ("time_holdout", "merchant_holdout"):
            new = report["timeHoldout" if name == "time_holdout" else "merchantHoldout"]
            old = (stored.get("splits") or {}).get(name) or {}
            print(
                f"  {name}: f1 stored={old.get('f1')} now={new.get('f1')} | "
                f"roc_auc stored={old.get('roc_auc')} now={new.get('roc_auc')}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
