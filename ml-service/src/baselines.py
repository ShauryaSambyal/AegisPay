"""Adaptive per-merchant baselines with an explicit category fallback.

Baselines are computed from the *training* portion of the simulated history only
(rolling median / MAD), so a merchant's current window is never compared against
itself. If a merchant has fewer than ``MIN_BASELINE_TXNS`` transactions in the
baseline window, the category baseline is used and ``coldStart`` is reported.
"""

from __future__ import annotations

from datetime import timedelta

import numpy as np
import pandas as pd

from app import config


def _median_mad(values: np.ndarray) -> tuple[float, float]:
    if values.size == 0:
        return 0.0, 0.0
    median = float(np.median(values))
    mad = float(np.median(np.abs(values - median)))
    return median, mad


def merchant_baseline(group: pd.DataFrame) -> dict:
    amounts = group["amount"].to_numpy(dtype=float)
    hours = group["timestamp"].dt.hour.to_numpy()
    night = float(np.isin(hours, [22, 23, 0, 1, 2, 3]).mean()) if hours.size else 0.0
    round_share = float(((amounts % 500 == 0) & (amounts >= 500)).mean()) if amounts.size else 0.0
    amount_median, amount_mad = _median_mad(amounts)

    # Per-window night/round shares are needed as inputs to the MAD, so build
    # them from 3-day windows inside the baseline slice.
    window_nights: list[float] = []
    window_rounds: list[float] = []
    frame = group.copy()
    frame["windowSeq"] = (frame["timestamp"].dt.normalize() - frame["timestamp"].dt.normalize().min()).dt.days // 3
    for _, window in frame.groupby("windowSeq"):
        window_amounts = window["amount"].to_numpy(dtype=float)
        window_hours = window["timestamp"].dt.hour.to_numpy()
        window_nights.append(float(np.isin(window_hours, [22, 23, 0, 1, 2, 3]).mean()))
        window_rounds.append(float(((window_amounts % 500 == 0) & (window_amounts >= 500)).mean()))

    night_median, night_mad = _median_mad(np.array(window_nights, dtype=float))
    round_median, round_mad = _median_mad(np.array(window_rounds, dtype=float))

    return {
        "source": "merchant_rolling",
        "sampleSize": int(len(group)),
        "amount_median": amount_median,
        "amount_mad": amount_mad,
        "night_median": night_median,
        "night_mad": night_mad,
        "round_median": round_median,
        "round_mad": round_mad,
        "night_share": night,
        "round_share": round_share,
        "windowDays": config.BASELINE_WINDOW_DAYS,
    }


def build_baselines(transactions: pd.DataFrame, cutoff: pd.Timestamp) -> dict:
    """Build merchant + category baselines from data strictly before ``cutoff``."""
    history = transactions[transactions["timestamp"] < cutoff]
    window_start = cutoff - timedelta(days=config.BASELINE_WINDOW_DAYS)
    recent = history[history["timestamp"] >= window_start]

    merchants: dict[str, dict] = {}
    for merchant_id, group in recent.groupby("merchantId"):
        if len(group) >= config.MIN_BASELINE_TXNS:
            merchants[merchant_id] = merchant_baseline(group)

    categories: dict[str, dict] = {}
    for category, group in recent.groupby("category"):
        base = merchant_baseline(group)
        base["source"] = "category_fallback"
        categories[category] = base

    if not categories:
        raise ValueError("no training history available to build category baselines")

    # Any category missing from the recent slice falls back to the pooled pool.
    pooled = merchant_baseline(recent)
    pooled["source"] = "pooled_fallback"
    for category in config.CATEGORY_ORDER:
        categories.setdefault(category, pooled)

    return {
        "cutoff": str(cutoff),
        "windowDays": config.BASELINE_WINDOW_DAYS,
        "minTransactions": config.MIN_BASELINE_TXNS,
        "merchants": merchants,
        "categories": categories,
        "coldStartPolicy": (
            "Merchants with fewer than minTransactions in the trailing window use the "
            "category baseline and are flagged coldStart=1."
        ),
    }


def rolling_baseline_history(transactions: pd.DataFrame, cutoff: pd.Timestamp) -> dict:
    """Per-window medians over the training slice, for documentation and tests."""
    history = transactions[transactions["timestamp"] < cutoff].copy()
    history["windowSeq"] = (
        (history["timestamp"].dt.normalize() - history["timestamp"].dt.normalize().min()).dt.days // 3
    )
    rows = []
    for (merchant_id, window_seq), group in history.groupby(["merchantId", "windowSeq"]):
        rows.append(
            {
                "merchantId": merchant_id,
                "windowSeq": int(window_seq),
                "amountMedian": float(np.median(group["amount"])),
            }
        )
    return {"windows": rows}
