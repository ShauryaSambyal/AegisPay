"""Pydantic models mirroring the TypeScript API contract.

The real/simulated split is enforced at the boundary: anything that carries a
risk score must be a ``SimulatedMerchant``, whose id is constrained to the
``SIM-`` prefix by a pattern.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

DataOrigin = Literal["real_osm", "simulated"]
RiskTier = Literal["TIER_0_SAFE", "TIER_1_MONITOR", "TIER_2_RESTRICT", "TIER_3_QUARANTINE"]

SIM_ID_PATTERN = r"^SIM-[A-Za-z0-9-]+$"


class MerchantIdentity(BaseModel):
    """Real OpenStreetMap identity. Display only — no risk fields exist here."""

    id: str
    dataOrigin: Literal["real_osm"] = "real_osm"
    osmType: str
    osmId: int
    osmRef: str
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    source: Literal["OpenStreetMap"] = "OpenStreetMap"


class SimulatedMerchant(BaseModel):
    id: str = Field(pattern=SIM_ID_PATTERN)
    dataOrigin: Literal["simulated"] = "simulated"
    displayName: str
    category: str
    mcc: str
    riskScore: float = Field(ge=0, le=100)
    riskTier: RiskTier
    isBettingFront: bool = False
    baseline: dict = Field(default_factory=dict)


class Transaction(BaseModel):
    id: str
    merchantId: str = Field(pattern=SIM_ID_PATTERN)
    amount: float = Field(gt=0)
    currency: str = "INR"
    paymentMethod: str
    payerId: str
    payerCity: str
    payerState: str
    timestamp: datetime

    @field_validator("merchantId")
    @classmethod
    def _simulated_only(cls, value: str) -> str:
        if not value.startswith("SIM-"):
            raise ValueError("transactions may only reference SIM-* merchants")
        return value


class RiskAssessment(BaseModel):
    merchantId: str
    displayName: str | None = None
    category: str | None = None
    score: float = Field(ge=0, le=100)
    tier: RiskTier
    outcome: str | None = None
    outcomeLabel: str | None = None
    probability: float | None = None
    confidence: float | None = None
    recommendation: str | None = None
    reasons: list[str]
    components: dict
    features: dict | None = None
    evaluatedAt: datetime
    synthetic: bool = False
    disclaimer: str = ""


class ModelInfo(BaseModel):
    modelCard: dict
    metrics: dict
    provenance: dict
    limitations: list[str]


class DatasetProvenance(BaseModel):
    name: str
    canonicalUrl: str
    access: str
    available: bool
    license: str
    licenseEvidence: str | None = None
    datasetSchema: str | None = None
    usedForTraining: bool
    usedFor: str


class ScoreTransactionRequest(BaseModel):
    merchantId: str
    amount: float = Field(gt=0, le=10_000_000)
    payerId: str = "PYR-API-0001"
    payerCity: str = "Bengaluru"
    payerState: str = "Karnataka"
    paymentMethod: str = "UPI"
    timestamp: datetime | None = None


class ScoreMerchantRequest(BaseModel):
    merchantId: str | None = None
    businessName: str | None = None
    category: str | None = "retail"
    turnover: float | None = 500_000.0
    nightShare: float | None = None
    outOfStateShare: float | None = None
    roundAmountRatio: float | None = None
    repeatPayerRatio: float | None = None
    burstSyncRatio: float | None = None
    volumeMultiplier: float | None = None
    suspectedBettingActivity: bool | None = None


class HealthResponse(BaseModel):
    status: str
    modelLoaded: bool
    version: str
    artifacts: dict
    timestamp: datetime
