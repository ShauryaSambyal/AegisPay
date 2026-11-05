"""Graph analysis over SIM-* transactions only.

Two structures are built:

* a payer → merchant bipartite graph, used for degree / shared-payer overlap;
* a merchant → merchant directed graph where an edge A → B means at least
  ``MIN_SHARED_PAYERS`` distinct payers paid A and then B within six hours. This
  is what surfaces layering rings and is the only input to cycle detection.

Real OpenStreetMap businesses never enter this module: the caller only ever
passes simulated transactions.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

import networkx as nx
import pandas as pd

MIN_SHARED_PAYERS = 3
FLOW_WINDOW_HOURS = 6


def build_payer_graph(transactions: pd.DataFrame) -> nx.Graph:
    graph = nx.Graph()
    for row in transactions.itertuples(index=False):
        if not str(row.merchantId).startswith("SIM-"):
            raise ValueError(f"graph input contains a non-simulated merchant: {row.merchantId}")
        graph.add_node(row.payerId, kind="payer")
        graph.add_node(row.merchantId, kind="merchant")
        graph.add_edge(row.payerId, row.merchantId, amount=float(row.amount))
    return graph


def merchant_flow_graph(transactions: pd.DataFrame) -> nx.DiGraph:
    """Directed merchant graph built from payer sequences."""
    ordered = transactions.sort_values("timestamp")
    payers: dict[str, list[tuple[pd.Timestamp, str]]] = defaultdict(list)
    for row in ordered.itertuples(index=False):
        payers[row.payerId].append((row.timestamp, row.merchantId))

    edges: dict[tuple[str, str], set[str]] = defaultdict(set)
    for payer, visits in payers.items():
        for index, (timestamp, source) in enumerate(visits):
            for later_timestamp, target in visits[index + 1:]:
                if later_timestamp - timestamp > timedelta(hours=FLOW_WINDOW_HOURS):
                    break
                if source != target:
                    edges[(source, target)].add(payer)

    graph = nx.DiGraph()
    for (source, target), shared in edges.items():
        if len(shared) >= MIN_SHARED_PAYERS:
            graph.add_edge(source, target, sharedPayers=len(shared))
    return graph


def detect_cycles(graph: nx.DiGraph, max_length: int = 6) -> list[list[str]]:
    """Simple cycles in the merchant flow graph, bounded by length."""
    if graph.number_of_nodes() == 0:
        return []
    cycles: list[list[str]] = []
    for cycle in nx.simple_cycles(graph, length_bound=max_length):
        if len(cycle) >= 3:
            cycles.append(list(cycle))
    return cycles


def dense_components(graph: nx.Graph) -> list[list[str]]:
    """Cliques of size >= 3 in the merchant projection (dense ring candidates)."""
    if graph.number_of_nodes() < 3:
        return []
    cliques = [sorted(clique) for clique in nx.find_cliques(graph) if len(clique) >= 3]
    return sorted(cliques, key=len, reverse=True)


def merchant_projection(transactions: pd.DataFrame) -> nx.Graph:
    """Undirected merchant graph weighted by shared payers."""
    payers = transactions.groupby("payerId")["merchantId"].unique()
    graph = nx.Graph()
    graph.add_nodes_from(sorted(transactions["merchantId"].unique()))
    for merchants in payers:
        unique = sorted(merchants)
        for index, source in enumerate(unique):
            for target in unique[index + 1:]:
                weight = graph.get_edge_data(source, target, {}).get("weight", 0) + 1
                graph.add_edge(source, target, weight=weight)
    return graph


def merchant_graph_features(transactions: pd.DataFrame) -> dict[tuple[str, int], dict]:
    """Graph features keyed by (merchantId, windowSeq).

    Each window is scored against a graph built from the trailing 14 days of
    transactions so the features only use information available at that time.
    """
    frame = transactions.copy()
    frame["windowSeq"] = (
        (frame["timestamp"].dt.normalize() - frame["timestamp"].dt.normalize().min()).dt.days // 3
    )
    features: dict[tuple[str, int], dict] = {}
    for window_seq in sorted(frame["windowSeq"].unique()):
        window_end = frame[frame["windowSeq"] == window_seq]["timestamp"].max()
        trailing = frame[
            (frame["timestamp"] <= window_end)
            & (frame["timestamp"] > window_end - timedelta(days=14))
        ]
        payers = build_payer_graph(trailing)
        flows = merchant_flow_graph(trailing)
        cycles = detect_cycles(flows)
        cycle_nodes = {node for cycle in cycles for node in cycle}
        projection = merchant_projection(trailing)
        components = dense_components(projection)

        for merchant_id in frame[frame["windowSeq"] == window_seq]["merchantId"].unique():
            neighbours = set(projection.neighbors(merchant_id)) if projection.has_node(merchant_id) else set()
            overlap = 0.0
            if neighbours:
                degrees = [projection.degree(n) for n in neighbours]
                overlap = float(sum(degrees) / (len(degrees) * max(1, projection.degree(merchant_id))))
            component_size = 1
            for component in components:
                if merchant_id in component:
                    component_size = max(component_size, len(component))
            features[(merchant_id, int(window_seq))] = {
                "degree": projection.degree(merchant_id) if projection.has_node(merchant_id) else 0,
                "cycle_member": int(merchant_id in cycle_nodes),
                "shared_payer_overlap": min(1.0, overlap),
                "component_size": component_size,
                "out_degree": flows.out_degree(merchant_id) if flows.has_node(merchant_id) else 0,
                "in_degree": flows.in_degree(merchant_id) if flows.has_node(merchant_id) else 0,
                "cycles": cycles,
                "cliques": components,
            }
    return features


def graph_score(features: dict) -> float:
    """0-100 graph exposure score used by the risk engine."""
    score = 0.0
    if features.get("cycle_member"):
        score += 55.0
    score += min(25.0, 6.0 * float(features.get("degree", 0)))
    score += min(12.0, 4.0 * float(features.get("component_size", 1) - 1))
    score += 8.0 * float(features.get("shared_payer_overlap", 0.0))
    return float(min(100.0, round(score, 2)))
