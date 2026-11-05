"""Per-merchant-window features.

Every function is pure and unit-tested against known values. None of them reads
the label or the scenario column: labels live in ``data.build_windows`` and are
joined only after the feature matrix is built, which is enforced by
``tests/test_leakage.py``.
"""

from __future__ import annotations

import math
from collections import Counter

import numpy as np
import pandas as pd

FEATURE_NAMES = [
    "avg_amount_log",
    "amount_cv",
    "p90_amount_log",
    "round_amount_ratio",
    "night_share",
    "hour_entropy",
    "burst_sync_ratio",
    "benford_divergence",
    "geo_entropy",
    "out_of_state_share",
    "payer_repeat_ratio",
    "payer_churn_entropy",
    "category_drift_js",
    "amount_mad_z",
    "night_mad_z",
    "round_mad_z",
    "graph_degree",
    "graph_cycle_member",
    "graph_shared_payer_overlap",
    "graph_component_size",
]

NIGHT_HOURS = frozenset({22, 23, 0, 1, 2, 3})
BENFORD = np.array([math.log10(1 + 1 / digit) for digit in range(1, 10)])
AMOUNT_BUCKETS = np.array([0, 250, 500, 1000, 2500, 5000, 10000, 25000, np.inf])
EPS = 1e-9


def shannon_entropy(counts: list[int] | np.ndarray) -> float:
    """Shannon entropy in bits of a count vector (0 when empty or single value)."""
    values = np.asarray([c for c in counts if c > 0], dtype=float)
    if values.size <= 1:
        return 0.0
    probabilities = values / values.sum()
    return float(-(probabilities * np.log2(probabilities)).sum())


def normalized_entropy(counts: list[int] | np.ndarray) -> float:
    """Entropy divided by log2(number of observed categories), in [0, 1]."""
    values = np.asarray([c for c in counts if c > 0], dtype=float)
    if values.size <= 1:
        return 0.0
    return float(shannon_entropy(values) / math.log2(values.size))


def amount_features(amounts: np.ndarray) -> dict[str, float]:
    values = np.asarray(amounts, dtype=float)
    if values.size == 0:
        return {name: 0.0 for name in FEATURE_NAMES[:4]}
    mean = float(values.mean())
    std = float(values.std())
    return {
        "avg_amount_log": float(np.log1p(max(mean, 0.0))),
        "amount_cv": float(std / mean) if mean > 0 else 0.0,
        "p90_amount_log": float(np.log1p(np.percentile(values, 90))),
        "round_amount_ratio": round_ratio(values),
    }


def round_ratio(values: np.ndarray) -> float:
    values = np.asarray(values, dtype=float)
    if values.size == 0:
        return 0.0
    is_round = (values % 500 == 0) & (values >= 500)
    return float(is_round.mean())


def benford_divergence(amounts: np.ndarray) -> float:
    """Mean absolute deviation of the first-digit distribution from Benford."""
    values = np.asarray(amounts, dtype=float)
    values = values[np.isfinite(values) & (values >= 1)]
    if values.size < 10:
        return 0.0
    first_digits = np.array([int(str(int(v))[0]) for v in values])
    observed = np.array([(first_digits == digit).mean() for digit in range(1, 10)])
    return float(np.abs(observed - BENFORD).mean())


def temporal_features(timestamps: pd.Series) -> dict[str, float]:
    times = pd.to_datetime(pd.Series(timestamps))
    if len(times) == 0:
        return {"night_share": 0.0, "hour_entropy": 0.0, "burst_sync_ratio": 0.0}
    hours = times.dt.hour.to_numpy()
    hour_counts = Counter(int(hour) for hour in hours)
    night_share = float(np.isin(hours, list(NIGHT_HOURS)).mean())

    # Burst synchronisation: largest number of payments inside any 10-minute
    # window, normalised by the total number of payments. Seconds are used so
    # the calculation is independent of the pandas timestamp resolution.
    ordered = np.sort((times - times.min()).dt.total_seconds().to_numpy(dtype=float))
    window_seconds = 10 * 60
    best = 0
    left = 0
    for right in range(len(ordered)):
        while ordered[right] - ordered[left] > window_seconds:
            left += 1
        best = max(best, right - left + 1)
    return {
        "night_share": night_share,
        "hour_entropy": normalized_entropy(list(hour_counts.values())),
        "burst_sync_ratio": best / len(ordered),
    }


def geography_features(cities: pd.Series, states: pd.Series) -> dict[str, float]:
    city_counts = Counter(cities.fillna("unknown").tolist())
    state_counts = Counter(states.fillna("unknown").tolist())
    out_of_state = sum(count for state, count in state_counts.items() if state != "Karnataka")
    total = max(1, sum(state_counts.values()))
    return {
        "geo_entropy": normalized_entropy(list(city_counts.values())),
        "out_of_state_share": out_of_state / total,
    }


def payer_features(payers: pd.Series) -> dict[str, float]:
    counts = Counter(payers.tolist())
    total = max(1, sum(counts.values()))
    repeat = sum(count for count in counts.values() if count > 1)
    return {
        "payer_repeat_ratio": repeat / total,
        "payer_churn_entropy": normalized_entropy(list(counts.values())),
    }


def amount_distribution(amounts: np.ndarray) -> np.ndarray:
    """Histogram of log-spaced amount buckets, normalised to sum to 1."""
    values = np.asarray(amounts, dtype=float)
    if values.size == 0:
        return np.full(len(AMOUNT_BUCKETS) - 1, 1.0 / (len(AMOUNT_BUCKETS) - 1))
    counts, _ = np.histogram(values, bins=AMOUNT_BUCKETS)
    total = counts.sum()
    if total == 0:
        return np.full(len(counts), 1.0 / len(counts))
    return counts / total


def js_divergence(p: np.ndarray, q: np.ndarray) -> float:
    """Jensen-Shannon divergence (base 2) between two distributions, in [0, 1]."""
    p = np.asarray(p, dtype=float) + EPS
    q = np.asarray(q, dtype=float) + EPS
    p = p / p.sum()
    q = q / q.sum()
    midpoint = 0.5 * (p + q)

    def _kl(a: np.ndarray, b: np.ndarray) -> float:
        return float((a * np.log2(a / b)).sum())

    return max(0.0, min(1.0, 0.5 * _kl(p, midpoint) + 0.5 * _kl(q, midpoint)))


def robust_z(value: float, median: float, mad: float) -> float:
    """Modified z-score using median absolute deviation, clipped to [-20, 20]."""
    scale = 1.4826 * mad
    if not np.isfinite(scale) or scale <= EPS:
        return 0.0
    return float(np.clip((value - median) / scale, -20, 20))


def window_features(
    group: pd.DataFrame,
    category_amount_profile: np.ndarray,
    baseline: dict,
    graph_features: dict | None = None,
) -> dict[str, float]:
    """Feature vector for one merchant × window slice.

    ``baseline`` carries the merchant-level median/MAD (or category fallback) and
    is produced by :mod:`src.baselines`. ``graph_features`` comes from
    :mod:`src.graph` for the window's end date.
    """
    row: dict[str, float] = {}
    row.update(amount_features(group["amount"].to_numpy()))
    row.update(temporal_features(group["timestamp"]))
    row.update(geography_features(group["payerCity"], group["payerState"]))
    row.update(payer_features(group["payerId"]))
    row["benford_divergence"] = benford_divergence(group["amount"].to_numpy())
    row["category_drift_js"] = js_divergence(
        amount_distribution(group["amount"].to_numpy()), category_amount_profile
    )

    avg_amount = float(group["amount"].mean()) if len(group) else 0.0
    night_share = row["night_share"]
    round_share = row["round_amount_ratio"]
    row["amount_mad_z"] = robust_z(avg_amount, baseline["amount_median"], baseline["amount_mad"])
    row["night_mad_z"] = robust_z(night_share, baseline["night_median"], baseline["night_mad"])
    row["round_mad_z"] = robust_z(round_share, baseline["round_median"], baseline["round_mad"])

    graph = graph_features or {}
    row["graph_degree"] = float(graph.get("degree", 0))
    row["graph_cycle_member"] = float(graph.get("cycle_member", 0))
    row["graph_shared_payer_overlap"] = float(graph.get("shared_payer_overlap", 0.0))
    row["graph_component_size"] = float(graph.get("component_size", 1))

    return {name: float(row.get(name, 0.0)) for name in FEATURE_NAMES}


def category_profile(transactions: pd.DataFrame, category: str) -> np.ndarray:
    """Median amount histogram for a category (used as the drift reference)."""
    subset = transactions[transactions["category"] == category]
    if subset.empty:
        return np.full(len(AMOUNT_BUCKETS) - 1, 1.0 / (len(AMOUNT_BUCKETS) - 1))
    return amount_distribution(subset["amount"].to_numpy())


def build_feature_matrix(
    windows: pd.DataFrame,
    transactions: pd.DataFrame,
    baselines: dict,
    graph_features: dict[tuple[str, int], dict] | None = None,
) -> pd.DataFrame:
    """Join features onto the window index; labels stay in the index frame."""
    profiles = {
        category: category_profile(transactions, category)
        for category in windows["category"].unique()
    }
    frame = transactions.copy()
    frame["windowSeq"] = (
        (frame["timestamp"].dt.normalize() - frame["timestamp"].dt.normalize().min()).dt.days
        // 3
    )

    rows: list[dict] = []
    for record in windows.itertuples(index=False):
        key = (record.merchantId, int(record.windowSeq))
        group = frame[(frame["merchantId"] == record.merchantId) & (frame["windowSeq"] == key[1])]
        merchant_baseline = baselines["merchants"].get(record.merchantId)
        baseline = merchant_baseline or baselines["categories"][record.category]
        features = window_features(
            group,
            profiles[record.category],
            baseline,
            (graph_features or {}).get(key),
        )
        features["merchantId"] = record.merchantId
        features["windowSeq"] = key[1]
        features["category"] = record.category
        features["label"] = int(record.label)
        features["labelSource"] = record.labelSource
        features["scenario"] = record.scenario
        features["txnCount"] = int(record.txnCount)
        features["windowStart"] = record.windowStart
        features["coldStart"] = int(merchant_baseline is None)
        rows.append(features)
    return pd.DataFrame.from_records(rows)
