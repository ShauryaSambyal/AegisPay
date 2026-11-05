"""Known-value tests for the feature functions."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from src import features


def test_round_ratio_known_values():
    assert features.round_ratio(np.array([500.0, 1000.0, 250.5])) == pytest.approx(2 / 3)
    assert features.round_ratio(np.array([499.0, 251.0])) == 0.0
    assert features.round_ratio(np.array([])) == 0.0


def test_entropy_known_values():
    assert features.shannon_entropy([10, 10]) == pytest.approx(1.0)
    assert features.shannon_entropy([7]) == 0.0
    assert features.normalized_entropy([5, 5, 5, 5]) == pytest.approx(1.0)
    assert features.normalized_entropy([9, 1]) < 0.5


def test_js_divergence_bounds():
    uniform = np.array([0.25, 0.25, 0.25, 0.25])
    skewed = np.array([0.9, 0.05, 0.03, 0.02])
    assert features.js_divergence(uniform, uniform) == pytest.approx(0.0, abs=1e-6)
    assert 0 < features.js_divergence(uniform, skewed) <= 1.0


def test_benford_divergence_detects_uniform_prices():
    # Amounts with a Benford-like first digit should diverge less than
    # amounts that are all round thousands.
    benford_like = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9] * 20, dtype=float) * 10.0
    round_amounts = np.array([1000.0] * 180)
    assert features.benford_divergence(benford_like) < features.benford_divergence(round_amounts)


def test_temporal_features_night_and_burst():
    timestamps = pd.Series(
        pd.to_datetime(
            [
                "2026-10-01 23:00:00",
                "2026-10-01 23:04:00",
                "2026-10-01 23:08:00",
                "2026-10-01 11:00:00",
            ]
        )
    )
    result = features.temporal_features(timestamps)
    assert result["night_share"] == pytest.approx(0.75)
    assert result["burst_sync_ratio"] == pytest.approx(0.75)
    assert 0.0 <= result["hour_entropy"] <= 1.0


def test_geography_and_payer_features():
    cities = pd.Series(["Bengaluru", "Bengaluru", "Delhi", "Mumbai"])
    states = pd.Series(["Karnataka", "Karnataka", "Delhi", "Maharashtra"])
    geo = features.geography_features(cities, states)
    assert geo["out_of_state_share"] == pytest.approx(0.5)
    assert 0.0 < geo["geo_entropy"] <= 1.0

    payers = pd.Series(["A", "A", "B", "C"])
    payer = features.payer_features(payers)
    assert payer["payer_repeat_ratio"] == pytest.approx(0.5)
    assert payer["payer_churn_entropy"] > 0


def test_robust_z_clipping():
    assert features.robust_z(10, 10, 0) == 0.0
    assert features.robust_z(100, 10, 1) == pytest.approx(20.0)


def test_feature_matrix_is_complete(dataset):
    for name in features.FEATURE_NAMES:
        assert name in dataset.columns, name
        assert dataset[name].notna().all(), f"{name} has NaNs"
    assert len(dataset) > 0


def test_entropy_of_hours_is_bounded(transactions):
    result = features.temporal_features(transactions["timestamp"].head(500))
    assert 0.0 <= result["hour_entropy"] <= 1.0
    assert 0.0 <= result["night_share"] <= 1.0
    assert math.isfinite(result["burst_sync_ratio"])
