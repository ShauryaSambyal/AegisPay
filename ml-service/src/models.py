"""Training, calibration and evaluation for the merchant risk model.

Leakage guards:

* the model only ever sees ``features.FEATURE_NAMES``;
* the train slice excludes every window at or after the temporal cutoff and
  every merchant in the held-out merchant set;
* preprocessing (scaling is not needed for gradient boosting, but the baseline
  and category profile are) is fitted on the training slice only.

Two honest evaluation slices are reported:

``time_holdout``      future windows of merchants the model has trained on;
``merchant_holdout``  all windows of merchants the model has never seen. This
                      slice can be too small for a stable AUC, in which case the
                      metric is reported as ``null`` with the reason.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from app import config
from src import features as feature_module

ID_COLUMNS = {
    "merchantId",
    "windowSeq",
    "category",
    "label",
    "labelSource",
    "scenario",
    "txnCount",
    "windowStart",
    "coldStart",
}


def stable_bucket(value: str) -> float:
    """Deterministic [0, 1) bucket for a merchant id (stable across runs)."""
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:8]
    return int(digest, 16) / float(0xFFFFFFFF)


def split_merchants(merchant_ids: list[str], fraction: float | None = None) -> tuple[list[str], list[str]]:
    fraction = config.TEST_MERCHANT_FRACTION if fraction is None else fraction
    ordered = sorted(merchant_ids, key=stable_bucket)
    cut = max(1, int(round(len(ordered) * fraction)))
    test = sorted(ordered[:cut])
    train = sorted(set(ordered) - set(test))
    if not train:
        raise ValueError("merchant split produced an empty training set")
    return train, test


def feature_columns(frame: pd.DataFrame) -> list[str]:
    return [name for name in feature_module.FEATURE_NAMES if name in frame.columns]


def _base_estimator() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        max_depth=3,
        learning_rate=0.08,
        max_iter=250,
        min_samples_leaf=8,
        l2_regularization=1.0,
        random_state=config.SEED,
    )


def _class_weights(labels: np.ndarray) -> np.ndarray:
    positives = max(1, int(labels.sum()))
    negatives = max(1, len(labels) - positives)
    weight_positive = len(labels) / (2.0 * positives)
    weight_negative = len(labels) / (2.0 * negatives)
    return np.where(labels == 1, weight_positive, weight_negative)


def fit_model(train_frame: pd.DataFrame) -> tuple[object, str]:
    columns = feature_columns(train_frame)
    x_train = train_frame[columns].to_numpy(dtype=float)
    y_train = train_frame["label"].to_numpy(dtype=int)

    base = _base_estimator()
    calibration = "isotonic"
    try:
        model = CalibratedClassifierCV(base, method="isotonic", cv=3)
        model.fit(x_train, y_train, sample_weight=_class_weights(y_train))
    except Exception:  # insufficient class diversity for CV folds
        calibration = "none"
        model = base
        model.fit(x_train, y_train, sample_weight=_class_weights(y_train))
    return model, calibration


def predict_probability(model, frame: pd.DataFrame) -> np.ndarray:
    columns = feature_columns(frame)
    return model.predict_proba(frame[columns].to_numpy(dtype=float))[:, 1]


def best_f1_threshold(y_true: np.ndarray, y_score: np.ndarray) -> float:
    """Pick the F1-maximising threshold on TRAINING scores only."""
    best_threshold, best_f1 = 0.5, -1.0
    for candidate in np.round(np.linspace(0.05, 0.95, 19), 2):
        score = f1_score(y_true, (y_score >= candidate).astype(int), zero_division=0)
        if score > best_f1:
            best_threshold, best_f1 = float(candidate), float(score)
    return best_threshold


def _slice_metrics(y_true: np.ndarray, y_score: np.ndarray, threshold: float = 0.5) -> dict:
    y_pred = (y_score >= threshold).astype(int)
    metrics: dict = {
        "n": int(len(y_true)),
        "positives": int(y_true.sum()),
        "threshold": threshold,
        "precision": None,
        "recall": None,
        "f1": None,
        "roc_auc": None,
        "pr_auc": None,
        "confusion_matrix": None,
        "notes": [],
    }
    if len(y_true) == 0:
        metrics["notes"].append("empty slice")
        return metrics
    metrics["precision"] = float(precision_score(y_true, y_pred, zero_division=0))
    metrics["recall"] = float(recall_score(y_true, y_pred, zero_division=0))
    metrics["f1"] = float(f1_score(y_true, y_pred, zero_division=0))
    metrics["confusion_matrix"] = confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist()

    if y_true.sum() >= config.MIN_POSITIVES_FOR_AUC and (len(y_true) - y_true.sum()) >= 1:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_score))
        metrics["pr_auc"] = float(average_precision_score(y_true, y_score))
    else:
        metrics["notes"].append(
            f"AUC not reported: slice has {int(y_true.sum())} positives and "
            f"{int(len(y_true) - y_true.sum())} negatives (min {config.MIN_POSITIVES_FOR_AUC} positives)."
        )
    return metrics


def evaluate(model, frame: pd.DataFrame, name: str, threshold: float = 0.5) -> dict:
    y_true = frame["label"].to_numpy(dtype=int)
    y_score = predict_probability(model, frame)
    result = _slice_metrics(y_true, y_score, threshold)
    result["name"] = name
    result["merchants"] = sorted(frame["merchantId"].unique().tolist())
    return result


def feature_importance(model, frame: pd.DataFrame) -> dict:
    """Permutation importance on the held-out slice, plus mean |SHAP| when available."""
    columns = feature_columns(frame)
    x = frame[columns].to_numpy(dtype=float)
    y = frame["label"].to_numpy(dtype=int)
    importance: dict = {"method": "permutation_importance", "nRepeats": 10, "features": {}}

    if len(np.unique(y)) >= 2:
        try:
            result = permutation_importance(
                model, x, y, n_repeats=10, random_state=config.SEED, scoring="roc_auc"
            )
            importance["features"] = {
                name: float(value)
                for name, value in sorted(
                    zip(columns, result.importances_mean), key=lambda item: item[1], reverse=True
                )
            }
        except Exception as exc:  # pragma: no cover - defensive
            importance["error"] = f"permutation importance failed: {exc!r}"

    shap_values: dict[str, float] = {}
    try:
        import shap

        estimator = getattr(model, "calibrated_classifiers_", [None])[0]
        base = getattr(estimator, "estimator", None) or getattr(model, "estimator", None)
        if base is not None:
            explainer = shap.TreeExplainer(base)
            values = np.asarray(explainer.shap_values(x))
            if values.ndim == 3:
                values = np.abs(values).mean(axis=2)
            shap_values = {
                name: float(abs(value))
                for name, value in zip(columns, np.abs(values).mean(axis=0))
            }
    except Exception as exc:  # pragma: no cover - shap is optional at runtime
        importance["shapNote"] = f"SHAP unavailable: {exc!r}"

    if shap_values:
        importance["shapMeanAbs"] = dict(
            sorted(shap_values.items(), key=lambda item: item[1], reverse=True)
        )
    return importance


def train_bundle(dataset: pd.DataFrame, transactions: pd.DataFrame, baselines: dict) -> dict:
    """Fit the model and return everything the artifact writer needs."""
    print(f"[train] feature rows={len(dataset)} positives={int(dataset['label'].sum())}")

    train_merchants, test_merchants = split_merchants(sorted(dataset["merchantId"].unique()))
    cutoff_seq = int(np.quantile(dataset["windowSeq"], 1 - config.TEST_TIME_FRACTION))

    train_frame = dataset[
        dataset["merchantId"].isin(train_merchants) & (dataset["windowSeq"] < cutoff_seq)
    ]
    time_holdout = dataset[
        dataset["merchantId"].isin(train_merchants) & (dataset["windowSeq"] >= cutoff_seq)
    ]
    merchant_holdout = dataset[dataset["merchantId"].isin(test_merchants)]

    if train_frame["label"].sum() == 0:
        raise ValueError("training slice has no positive windows; check the injection window")
    if train_frame["label"].nunique() < 2:
        raise ValueError("training slice has a single class")

    model, calibration = fit_model(train_frame)

    # Choose the operating threshold on training scores only.
    train_scores = predict_probability(model, train_frame)
    threshold = best_f1_threshold(train_frame["label"].to_numpy(dtype=int), train_scores)

    metrics = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "seed": config.SEED,
        "modelVersion": config.MODEL_VERSION,
        "model": "HistGradientBoostingClassifier",
        "calibration": calibration,
        "windowDays": config.WINDOW_DAYS_AGG,
        "trainMerchants": train_merchants,
        "holdoutMerchants": test_merchants,
        "temporalCutoffWindowSeq": cutoff_seq,
        "splits": {
            "train": {
                "n": int(len(train_frame)),
                "positives": int(train_frame["label"].sum()),
                "merchants": train_merchants,
                "windows": [int(train_frame["windowSeq"].min()), int(train_frame["windowSeq"].max())],
            },
            "time_holdout": evaluate(model, time_holdout, "time_holdout", threshold) if len(time_holdout) else None,
            "merchant_holdout": evaluate(model, merchant_holdout, "merchant_holdout", threshold) if len(merchant_holdout) else None,
        },
        "operatingThreshold": threshold,
        "syntheticEvaluation": True,
        "caveat": (
            "All metrics are measured on synthetic simulated windows. They describe how well "
            "the pipeline separates injected typologies from the simulated normal population, "
            "not real-world betting-front detection performance."
        ),
    }
    print(
        f"[train] calibration={calibration} operatingThreshold={threshold:.4f} "
        f"train={len(train_frame)} timeHoldout={len(time_holdout)} merchantHoldout={len(merchant_holdout)}"
    )
    for slice_name in ("time_holdout", "merchant_holdout"):
        slice_metrics = metrics["splits"][slice_name]
        if slice_metrics:
            print(
                f"[train] {slice_name}: n={slice_metrics['n']} pos={slice_metrics['positives']} "
                f"precision={slice_metrics['precision']:.3f} recall={slice_metrics['recall']:.3f} "
                f"f1={slice_metrics['f1']:.3f} roc_auc={slice_metrics['roc_auc']} pr_auc={slice_metrics['pr_auc']}"
            )

    return {
        "model": model,
        "calibration": calibration,
        "threshold": threshold,
        "metrics": metrics,
        "importance": feature_importance(model, time_holdout if len(time_holdout) else train_frame),
        "featureNames": feature_columns(dataset),
        "baselines": baselines,
        "trainMerchants": train_merchants,
        "holdoutMerchants": test_merchants,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
    }
