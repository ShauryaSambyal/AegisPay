"""Shared fixtures: make the service importable and build the world once."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app import config  # noqa: E402
from src import baselines, data, features, graph  # noqa: E402


@pytest.fixture(scope="session")
def merchants():
    return data.load_catalog()


@pytest.fixture(scope="session")
def transactions(merchants):
    return data.generate_transactions(merchants)


@pytest.fixture(scope="session")
def windows(transactions, merchants):
    return data.build_windows(transactions, merchants)


@pytest.fixture(scope="session")
def baseline_set(transactions):
    cutoff = transactions["timestamp"].max() - (transactions["timestamp"].max() - transactions["timestamp"].min()) * config.TEST_TIME_FRACTION
    return baselines.build_baselines(transactions, cutoff)


@pytest.fixture(scope="session")
def graph_features(transactions):
    return graph.merchant_graph_features(transactions)


@pytest.fixture(scope="session")
def dataset(windows, transactions, baseline_set, graph_features):
    return features.build_feature_matrix(windows, transactions, baseline_set, graph_features)


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
