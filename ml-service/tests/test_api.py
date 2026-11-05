"""API contract tests for the FastAPI service."""

from __future__ import annotations

from src import artifacts


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"healthy", "degraded"}
    assert "modelLoaded" in payload
    assert "version" in payload


def test_model_info_requires_artifact(client):
    artifacts.load_bundle.cache_clear() if hasattr(artifacts.load_bundle, "cache_clear") else None
    response = client.get("/model/info")
    assert response.status_code in {200, 503}
    if response.status_code == 200:
        payload = response.json()
        assert payload["modelCard"]["evaluation"] == "synthetic_evaluation"
        assert payload["metrics"]["syntheticEvaluation"] is True
        assert payload["limitations"]


def test_datasets_endpoint(client):
    response = client.get("/datasets")
    assert response.status_code == 200
    payload = response.json()
    names = {entry["name"] for entry in payload["datasets"]}
    assert {"AMLSim", "PaySim", "BankSim", "MoMTSim"}.issubset(names)
    assert payload["trainingProvenance"]


def test_score_merchant_for_simulated_id(client):
    response = client.post("/score/merchant", json={"merchantId": "SIM-0001"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["merchantId"] == "SIM-0001"
    assert 0 <= payload["score"] <= 100
    assert payload["tier"].startswith("TIER_")
    assert payload["reasons"]
    assert payload["synthetic"] is True


def test_score_transaction_for_simulated_id(client):
    response = client.post(
        "/score/transaction",
        json={
            "merchantId": "SIM-0003",
            "amount": 5000,
            "payerId": "PYR-API-1",
            "payerCity": "New Delhi",
            "payerState": "Delhi",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["assessment"]["tier"].startswith("TIER_")
    assert payload["assessment"]["reasons"]
    assert payload["features"]["round_amount_ratio"] >= 0


def test_real_merchant_is_rejected(client):
    for path, body in (
        ("/score/merchant", {"merchantId": "OSM-N343089650"}),
        ("/score/transaction", {"merchantId": "OSM-N343089650", "amount": 100}),
    ):
        response = client.post(path, json=body)
        assert response.status_code == 422, path
        error = response.json()["error"]
        assert error["code"] == "NON_SIMULATED_MERCHANT"
        assert error["message"]


def test_unknown_simulated_merchant_is_404(client):
    response = client.post("/score/merchant", json={"merchantId": "SIM-9999"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MERCHANT_NOT_FOUND"


def test_invalid_payload_uses_error_envelope(client):
    response = client.post("/score/transaction", json={"merchantId": "SIM-0001", "amount": -5})
    assert response.status_code == 422
    body = response.json()
    assert set(body["error"]) >= {"code", "message"}
