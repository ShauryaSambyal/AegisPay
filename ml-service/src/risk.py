"""Deterministic 0-100 risk engine.

Three components are blended:

``rule``   interpretable behavioural rules (0-100) over the same features;
``model``  calibrated model probability × 100;
``graph``  network exposure from :func:`src.graph.graph_score`.

Weights come from ``app.config.RISK_WEIGHTS`` and sum to 1.0. The engine is pure
and covered by unit tests, so the same inputs always produce the same score,
tier and reasons.
"""

from __future__ import annotations

from app import config

TIER_ORDER = ["TIER_0_SAFE", "TIER_1_MONITOR", "TIER_2_RESTRICT", "TIER_3_QUARANTINE"]


def tier_for(score: float) -> str:
    """Map a 0-100 score to a tier using the documented thresholds."""
    if score < 0 or score > 100:
        raise ValueError(f"risk score out of range: {score}")
    if score <= config.TIER_THRESHOLDS["TIER_0_SAFE"]:
        return "TIER_0_SAFE"
    if score <= config.TIER_THRESHOLDS["TIER_1_MONITOR"]:
        return "TIER_1_MONITOR"
    if score <= config.TIER_THRESHOLDS["TIER_2_RESTRICT"]:
        return "TIER_2_RESTRICT"
    return "TIER_3_QUARANTINE"


def _clip(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def rule_components(features: dict) -> dict[str, float]:
    """Interpretable 0-100 sub-scores. Each maps one behaviour family."""
    temporal = _clip(
        14.0 * max(0.0, features.get("night_mad_z", 0.0))
        + 55.0 * min(1.0, features.get("night_share", 0.0) / 0.6)
        + 40.0 * min(1.0, features.get("burst_sync_ratio", 0.0) / 0.25)
    )
    amount = _clip(
        12.0 * max(0.0, features.get("amount_mad_z", 0.0))
        + 60.0 * min(1.0, features.get("round_amount_ratio", 0.0) / 0.6)
        + 8.0 * max(0.0, features.get("round_mad_z", 0.0))
    )
    geography = _clip(
        90.0 * min(1.0, features.get("out_of_state_share", 0.0) / 0.6)
        + 10.0 * min(1.0, features.get("geo_entropy", 0.0))
    )
    payer = _clip(
        (1.0 - min(1.0, features.get("payer_repeat_ratio", 1.0) / 0.35)) * 85.0
        + 15.0 * min(1.0, features.get("payer_churn_entropy", 0.0))
    )
    distribution = _clip(
        180.0 * min(1.0, features.get("benford_divergence", 0.0) / 0.06)
        + 90.0 * min(1.0, features.get("category_drift_js", 0.0) / 0.35)
    )
    return {
        "temporal": round(temporal, 2),
        "amount": round(amount, 2),
        "geography": round(geography, 2),
        "payer": round(payer, 2),
        "distribution": round(distribution, 2),
    }


def rule_score(features: dict) -> float:
    components = rule_components(features)
    weighted = (
        components["temporal"] * 0.24
        + components["amount"] * 0.22
        + components["geography"] * 0.12
        + components["payer"] * 0.17
        + components["distribution"] * 0.10
        + _clip(features.get("graph_cycle_member", 0.0) * 60.0
                + features.get("graph_component_size", 1) * 3.0) * 0.15
    )
    return round(_clip(weighted), 2)


def build_reasons(features: dict) -> list[str]:
    """Human-readable reasons, ordered by how strongly they fired."""
    candidates: list[tuple[float, str]] = []

    night_z = features.get("night_mad_z", 0.0)
    if night_z > 1.5:
        candidates.append(
            (night_z, f"Late-night share is {night_z:.1f} robust deviations above this merchant's own baseline.")
        )
    if features.get("burst_sync_ratio", 0.0) > 0.15:
        candidates.append(
            (features["burst_sync_ratio"] * 8,
             f"{features['burst_sync_ratio']:.0%} of payments land inside a single 10-minute burst window.")
        )
    if features.get("round_amount_ratio", 0.0) > 0.35:
        candidates.append(
            (features["round_amount_ratio"] * 5,
             f"{features['round_amount_ratio']:.0%} of tickets are exact ₹500/₹1,000/₹5,000-style round amounts.")
        )
    if features.get("out_of_state_share", 0.0) > 0.35:
        candidates.append(
            (features["out_of_state_share"] * 4,
             f"{features['out_of_state_share']:.0%} of payers are registered outside Karnataka.")
        )
    if features.get("payer_repeat_ratio", 1.0) < 0.2:
        candidates.append(
            (1.0 - features["payer_repeat_ratio"],
             f"Only {features['payer_repeat_ratio']:.0%} of payer IDs ever return (low retention).")
        )
    if features.get("benford_divergence", 0.0) > 0.03:
        candidates.append(
            (features["benford_divergence"] * 25,
             f"First-digit amount distribution deviates from Benford's law by {features['benford_divergence']:.3f} (mean absolute).")
        )
    if features.get("category_drift_js", 0.0) > 0.25:
        candidates.append(
            (features["category_drift_js"] * 3,
             f"Amount distribution has drifted away from its category baseline (JS divergence {features['category_drift_js']:.2f}).")
        )
    if features.get("graph_cycle_member", 0.0) >= 1:
        candidates.append((5.0, "Merchant participates in a circular payer flow with other SIM merchants."))
    if features.get("graph_component_size", 1) >= 3:
        candidates.append(
            (float(features["graph_component_size"]),
             f"Part of a dense group of {int(features['graph_component_size'])} SIM merchants sharing payers.")
        )
    if not candidates:
        candidates.append((1.0, "No behavioural signal exceeded its configured threshold."))

    seen: set[str] = set()
    reasons: list[str] = []
    for _, text in sorted(candidates, key=lambda item: item[0], reverse=True):
        if text in seen:
            continue
        seen.add(text)
        reasons.append(text)
        if len(reasons) >= config.TOP_REASONS:
            break
    return reasons


def assess(features: dict, model_probability: float, graph_features: dict | None = None) -> dict:
    """Blend rule, model and graph evidence into a deterministic assessment."""
    from src.graph import graph_score

    graph_value = graph_score(graph_features or {})
    rule_value = rule_score(features)
    blended = (
        config.RISK_WEIGHTS["rule"] * rule_value
        + config.RISK_WEIGHTS["model"] * model_probability * 100.0
        + config.RISK_WEIGHTS["graph"] * graph_value
    )
    score = round(_clip(blended), 2)
    return {
        "score": score,
        "tier": tier_for(score),
        "reasons": build_reasons(features),
        "components": {
            "rule": rule_value,
            "model": round(model_probability * 100.0, 2),
            "graph": graph_value,
            "weights": dict(config.RISK_WEIGHTS),
            "rules": rule_components(features),
        },
    }
