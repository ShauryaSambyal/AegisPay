"""Baseline, graph and risk-engine tests."""

from __future__ import annotations

import networkx as nx
import numpy as np
import pandas as pd
import pytest

from app import config
from src import baselines, graph, risk


def test_category_baseline_used_when_history_is_short(transactions):
    cutoff = transactions["timestamp"].max() - (transactions["timestamp"].max() - transactions["timestamp"].min()) * 0.25
    baseline_set = baselines.build_baselines(transactions, cutoff)
    assert baseline_set["categories"]
    for name, entry in baseline_set["categories"].items():
        assert entry["source"] in {"category_fallback", "pooled_fallback"}, name
        assert entry["amount_median"] > 0
    for entry in baseline_set["merchants"].values():
        assert entry["sampleSize"] >= config.MIN_BASELINE_TXNS
        assert entry["source"] == "merchant_rolling"


def test_merchant_baseline_uses_median_and_mad():
    frame = pd.DataFrame(
        {
            "amount": [100.0, 100.0, 100.0, 100.0, 9000.0],
            "timestamp": pd.to_datetime(["2026-10-01 10:00", "2026-10-01 11:00", "2026-10-02 10:00", "2026-10-02 12:00", "2026-10-03 13:00"]),
        }
    )
    baseline = baselines.merchant_baseline(frame)
    assert baseline["amount_median"] == pytest.approx(100.0)
    assert baseline["amount_mad"] == pytest.approx(0.0)


def test_cycle_detection_finds_three_cycle():
    flow = nx.DiGraph()
    flow.add_edge("SIM-1", "SIM-2")
    flow.add_edge("SIM-2", "SIM-3")
    flow.add_edge("SIM-3", "SIM-1")
    cycles = graph.detect_cycles(flow)
    assert len(cycles) == 1
    assert set(cycles[0]) == {"SIM-1", "SIM-2", "SIM-3"}


def test_dense_components_finds_clique():
    projection = nx.Graph()
    projection.add_edge("SIM-1", "SIM-2")
    projection.add_edge("SIM-2", "SIM-3")
    projection.add_edge("SIM-1", "SIM-3")
    assert graph.dense_components(projection) == [["SIM-1", "SIM-2", "SIM-3"]]


def test_graph_rejects_real_merchant_ids():
    frame = pd.DataFrame(
        [
            {
                "merchantId": "OSM-N343089650",
                "payerId": "PYR-1",
                "amount": 100.0,
                "timestamp": pd.Timestamp("2026-10-01"),
            }
        ]
    )
    with pytest.raises(ValueError):
        graph.build_payer_graph(frame)


def test_graph_score_is_bounded():
    assert graph.graph_score({}) == 0.0
    high = graph.graph_score(
        {"cycle_member": 1, "degree": 9, "component_size": 6, "shared_payer_overlap": 1.0}
    )
    assert 0.0 <= high <= 100.0


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (0.0, "TIER_0_SAFE"),
        (25.0, "TIER_0_SAFE"),
        (25.1, "TIER_1_MONITOR"),
        (55.0, "TIER_1_MONITOR"),
        (55.1, "TIER_2_RESTRICT"),
        (80.0, "TIER_2_RESTRICT"),
        (80.1, "TIER_3_QUARANTINE"),
        (100.0, "TIER_3_QUARANTINE"),
    ],
)
def test_tier_thresholds(score, expected):
    assert risk.tier_for(score) == expected


def test_tier_rejects_out_of_range():
    with pytest.raises(ValueError):
        risk.tier_for(101)


def test_assessment_is_deterministic():
    features = {
        "night_share": 0.7,
        "night_mad_z": 6.0,
        "burst_sync_ratio": 0.4,
        "round_amount_ratio": 0.9,
        "round_mad_z": 8.0,
        "out_of_state_share": 0.85,
        "geo_entropy": 0.9,
        "payer_repeat_ratio": 0.02,
        "payer_churn_entropy": 0.95,
        "benford_divergence": 0.05,
        "category_drift_js": 0.5,
        "amount_mad_z": 5.0,
        "graph_cycle_member": 1,
        "graph_component_size": 4,
    }
    first = risk.assess(features, 0.91, {"cycle_member": 1, "degree": 4, "component_size": 4})
    second = risk.assess(features, 0.91, {"cycle_member": 1, "degree": 4, "component_size": 4})
    assert first == second
    assert first["tier"] == "TIER_3_QUARANTINE"
    assert 1 <= len(first["reasons"]) <= config.TOP_REASONS
    assert set(first["components"]["weights"]) == {"rule", "model", "graph"}


def test_benign_assessment_stays_low():
    benign = {
        "night_share": 0.02,
        "night_mad_z": 0.1,
        "burst_sync_ratio": 0.02,
        "round_amount_ratio": 0.03,
        "round_mad_z": 0.0,
        "out_of_state_share": 0.02,
        "geo_entropy": 0.2,
        "payer_repeat_ratio": 0.45,
        "payer_churn_entropy": 0.4,
        "benford_divergence": 0.01,
        "category_drift_js": 0.05,
        "amount_mad_z": 0.2,
        "graph_cycle_member": 0,
        "graph_component_size": 1,
    }
    result = risk.assess(benign, 0.03, {})
    assert result["score"] < 30
    assert result["tier"] in {"TIER_0_SAFE", "TIER_1_MONITOR"}


def test_simulated_world_never_contains_real_ids(transactions):
    assert transactions["merchantId"].str.startswith("SIM-").all()
    assert np.isfinite(transactions["amount"]).all()
