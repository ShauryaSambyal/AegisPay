# API contract

Three services: Express/TypeScript API on `:5000`, React/Vite frontend on
`:5173`, FastAPI ML service on `:8001`.

Two rules hold everywhere in this contract:

1. **Real OpenStreetMap identities are display-only.** They are `dataOrigin:
   "real_osm"`, have ids of the form `OSM-<type><id>`, and carry **no** risk
   score, tier, drift metric, transaction, fraud label, syndicate edge,
   intervention or model output.
2. **Every financial or risk-bearing record is simulated**, uses an id of the
   form `SIM-xxxx`, and carries a fictional display name.

Both are enforced in TypeScript (`RealMerchantId = \`OSM-${string}\`` vs
`SimMerchantId = \`SIM-${string}\``, disjoint template-literal types), in
Pydantic (`Field(pattern=r"^SIM-[A-Za-z0-9-]+$")`), and at runtime (HTTP 409).

## Error shape

Every error response uses one envelope:

```json
{
  "error": {
    "code": "REAL_MERCHANT_DISPLAY_ONLY",
    "message": "Real OpenStreetMap merchants are display-only directory records and carry no risk, transaction, drift or syndicate data.",
    "details": { "merchantId": "OSM-N343089650", "dataOrigin": "real_osm" }
  }
}
```

| Code | Status | Meaning |
| --- | --- | --- |
| `REAL_MERCHANT_DISPLAY_ONLY` | 409 | A real OSM id was used where simulated risk data is required |
| `SIMULATED_ONLY` | 409 | Endpoint accepts only `SIM-*` ids |
| `NOT_FOUND` | 404 | Unknown merchant id |
| `INVALID_SCENARIO` / `INVALID_TIER` / `INVALID_QUERY` | 400 | Bad input |
| `NON_SIMULATED_MERCHANT` | 422 | ML service rejected a non-`SIM-*` id |
| `MODEL_NOT_TRAINED` | 503 | ML artifacts missing; run `scripts/train.py` |
| `ML_SERVICE_UNAVAILABLE` | 502 | Express could not reach `ML_SERVICE_URL` within 4s |
| `ROUTE_NOT_FOUND` | 404 | No matching Express route |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Express routes (`:5000`)

### `GET /api/health`

```json
{
  "status": "online",
  "service": "AegisPay Sentinel API",
  "dataModel": {
    "realMerchants": { "origin": "real_osm", "count": 360, "riskFields": false },
    "simulatedMerchants": { "origin": "simulated", "count": 14 }
  },
  "aiEngine": "Deterministic heuristic reports",
  "authEngine": "Firebase Admin active",
  "mlServiceUrl": "http://127.0.0.1:8001",
  "timestamp": "2026-11-05T..."
}
```

### `GET /api/auth/status`

Returns Firebase configuration and engine status.

```json
{
  "success": true,
  "data": {
    "configured": true,
    "adminSdkReady": true,
    "webApiKeyConfigured": true,
    "features": {
      "registration": true,
      "emailPasswordLogin": true,
      "tokenVerification": true,
      "customTokens": true
    }
  }
}
```

### `POST /api/auth/register`

Register a new user account with Firebase.

Request body:
```json
{
  "email": "analyst@example.com",
  "password": "Password123!",
  "displayName": "Jane Doe",
  "role": "analyst"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "uid": "...",
    "email": "analyst@example.com",
    "displayName": "Jane Doe",
    "role": "analyst",
    "emailVerified": false,
    "createdAt": "..."
  },
  "tokens": {
    "idToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

### `POST /api/auth/login`

Authenticate user with email and password, or verify client Firebase ID token.

Request body (Option A - email/password):
```json
{
  "email": "analyst@example.com",
  "password": "Password123!"
}
```

Request body (Option B - ID token verification):
```json
{
  "idToken": "<firebase_id_token>"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "uid": "...",
    "email": "analyst@example.com",
    "displayName": "Jane Doe",
    "role": "analyst"
  },
  "tokens": {
    "idToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

### `GET /api/auth/me`

Protected route. Requires `Authorization: Bearer <idToken>`. Returns authenticated user record and claims.

### `POST /api/auth/verify`

Verifies a token passed in body `{ "idToken": "..." }` or `Authorization: Bearer <token>`.

### `POST /api/auth/logout`

Revokes refresh tokens for user session.

### `POST /api/auth/forgot-password`

Request body: `{ "email": "analyst@example.com" }`. Sends reset email or returns reset link.


### `GET /api/merchants?origin=real_osm|simulated|all`

`origin` defaults to `all`. Every item carries `dataOrigin`.

```json
{
  "success": true,
  "origin": "all",
  "realCount": 360,
  "simulatedCount": 14,
  "meta": { "real": { "license": "ODbL-1.0", "attribution": "© OpenStreetMap contributors" }, "simulated": {} },
  "data": [
    {
      "id": "OSM-N343089650",
      "dataOrigin": "real_osm",
      "osmType": "node",
      "osmId": 343089650,
      "osmRef": "node/343089650",
      "name": "Thom's Bakery",
      "category": "bakery",
      "categoryLabel": "Bakery",
      "address": "# 1/2, Wheeler Road, Bengaluru, 560005",
      "latitude": 12.9915471,
      "longitude": 77.614181,
      "source": "OpenStreetMap",
      "license": "ODbL-1.0",
      "attribution": "© OpenStreetMap contributors",
      "displayOnly": true
    },
    {
      "id": "SIM-0001",
      "dataOrigin": "simulated",
      "displayName": "Aurora Bakehouse",
      "category": "bakery",
      "mcc": "5462",
      "riskScore": 78,
      "riskTier": "TIER_2_RESTRICT",
      "isBettingFront": true,
      "baseline": { "avgTicket": 205, "nightShare": 0.03, "source": "onboarding_90d" }
    }
  ]
}
```

### `GET /api/merchants/:id`

* Real id → the same real record, **no** `riskScore`, `riskTier`, `driftScore`,
  `metrics`, `riskFactors`, `interventions`, `status`.
* Simulated id → simulated merchant plus `driftAnalysis` (see `DriftBreakdown`).
* Unknown id → 404 `NOT_FOUND`.

### `POST /api/merchants/:id/tier` (simulated only)

Request: `{ "tier": "TIER_2_RESTRICT", "rollingReservePercent": 25, "smartGeoFenceActive": true, "videoPosRequested": true, "strFiled": false }`

Real id → **409** `REAL_MERCHANT_DISPLAY_ONLY`. Unknown SIM id → 404.

### `GET /api/risk/merchant/:id` (simulated only)

Real id → **409**. Response:

```json
{
  "success": true,
  "data": {
    "dataOrigin": "simulated",
    "merchantId": "SIM-0001",
    "score": 78,
    "tier": "TIER_2_RESTRICT",
    "reasons": ["Late-night share is 42% against an onboarding baseline of 3%.", "..."],
    "components": { "temporalAnomaly": 71, "geographicEntropy": 92, "amountDistribution": 68, "payerEntropy": 86, "baselineDeviation": 74 },
    "computedAt": "2026-11-05T...",
    "coldStart": false
  },
  "breakdown": { "dataOrigin": "simulated", "merchantId": "SIM-0001", "compositeScore": 78, "tier": "TIER_2_RESTRICT", "components": {} }
}
```

### `GET /api/transactions?merchantId=SIM-0001&minRisk=70`

Real `merchantId` → **409**. Unknown id → empty list (200). Every record has
`dataOrigin: "simulated"` and a `SIM-*` `merchantId`.

### `GET /api/transactions/stats`

Simulated stream statistics: total, flagged (≥70), volume, average risk, SIM
merchant counts by tier.

### `POST /api/simulator/run`

Request: `{ "scenario": "IPL_BETTING_BURST" | "FESTIVE_BAKERY_RUSH" | "MULE_RING_SMURF" | "RESET", "merchantId": "SIM-0001" }`

`merchantId` is optional. Real id → **409**; unknown SIM id → 404; bad scenario
→ 400.

```json
{
  "success": true,
  "message": "Injected 8 simulated late-night stake payments into Aurora Bakehouse.",
  "addedCount": 8,
  "targetMerchantIds": ["SIM-0001"],
  "transactions": [ { "id": "TXN-IPL_BETTING_BURST-...", "dataOrigin": "simulated", "merchantId": "SIM-0001" } ]
}
```

`POST /api/simulator/scenario` accepts the same body (back-compatible alias).
`POST /api/simulator/reset` restores the seeded initial stream.

### `GET /api/syndicate/graph`

Nodes are `SIM-*` merchants plus `CLUSTER-*`, `HUB-*`, `INFRA-*` synthetic
infrastructure. Links reference those ids only.

### `POST /api/ai/investigate/:id` (simulated only)

Real id → **409**. Returns `AIInvestigationReport` with
`dataOrigin: "simulated"`. Uses Gemini when `GEMINI_API_KEY` is set, otherwise a
deterministic heuristic report.

### `GET /api/osm/status`, `GET /api/osm/shops?category=`, `POST /api/osm/refresh`

Overpass configuration and the normalized real-shop directory. No risk data in
any response.

## Express → ML proxy (`/api/ml/*`)

Base URL: `process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8001"`. Timeout 4s.
On transport failure the proxy answers **502** `ML_SERVICE_UNAVAILABLE` with the
command needed to start the service.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/api/ml/health` | — | service status, `modelLoaded`, version |
| GET | `/api/ml/model/info` | — | model card, metrics, provenance, limitations |
| GET | `/api/ml/datasets` | — | per-dataset access/licence/status |
| POST | `/api/ml/score/transaction` | `{merchantId, amount, payerId?, payerCity?, payerState?, paymentMethod?, timestamp?}` | `SIM-*` only |
| POST | `/api/ml/score/merchant` | `{merchantId}` | aggregates the merchant's latest 3-day SIM window |

## FastAPI routes (`:8001`)

### `GET /health`

```json
{ "status": "healthy", "modelLoaded": true, "version": "1.0.0",
  "artifacts": { "model": true, "metrics": true, "modelCard": true, "featureImportance": true },
  "timestamp": "2026-11-05T..." }
```

### `GET /model/info`

Returns `modelCard` (version, seed, features, `evaluation: "synthetic_evaluation"`,
`syntheticDataWarning`, `limitations`), `metrics` (both holdout slices),
`featureImportance`, `provenance`, and `disclaimer`.

### `GET /datasets`

Returns `datasets[]` (name, canonical URL, access result, `available`, licence,
licence evidence, schema, `usedForTraining`, `usedFor`), `trainingProvenance`,
and `environment`.

### `POST /score/transaction`

```json
{ "merchantId": "SIM-0003", "amount": 5000, "payerId": "PYR-API-1",
  "payerCity": "New Delhi", "payerState": "Delhi" }
```

```json
{
  "merchantId": "SIM-0003",
  "transaction": { "amount": 5000, "payerCity": "New Delhi", "payerState": "Delhi", "timestamp": "..." },
  "assessment": {
    "score": 86.4, "tier": "TIER_3_QUARANTINE",
    "reasons": ["...", "..."],
    "components": { "rule": 79.1, "model": 98.2, "graph": 72.0, "weights": { "rule": 0.35, "model": 0.45, "graph": 0.2 }, "rules": {} },
    "synthetic": true, "disclaimer": "..."
  },
  "features": { "avg_amount_log": 8.1, "round_amount_ratio": 0.42 },
  "baselineSource": "merchant_rolling",
  "coldStart": false
}
```

Non-`SIM-*` id → **422** `NON_SIMULATED_MERCHANT`. Unknown SIM id → **404**
`MERCHANT_NOT_FOUND`. Invalid amount → **422** `INVALID_REQUEST`.

### `POST /score/merchant`

`{ "merchantId": "SIM-0001" }` → score, tier, reasons, components, window start,
transaction count, `synthetic: true`.

## Field parity (TypeScript ↔ Python)

| Concept | `backend/src/types/index.ts` | `frontend/src/types.ts` | `ml-service/app/schemas.py` |
| --- | --- | --- | --- |
| Origin discriminator | `DataOrigin` | `DataOrigin` | `DataOrigin` |
| Real identity | `RealMerchant` | `RealMerchant` | `MerchantIdentity` |
| Simulated identity | `SimulatedMerchant` | `SimulatedMerchant` | `SimulatedMerchant` |
| Simulated payment | `Transaction` | `Transaction` | `Transaction` |
| Risk output | `RiskAssessment`, `DriftBreakdown` | same | `RiskAssessment` |
| Model card | `MlModelInfo` (frontend) | `MlModelInfo` | `ModelInfo` |
| Dataset status | `/api/ml/datasets` | `DatasetEntry` | `DatasetProvenance` |
| Error body | `ApiErrorBody` | `ApiErrorBody` | `{error:{code,message,details}}` |

Deliberate asymmetries, all one-directional:

* Backend `SimulatedMerchant` carries `metrics` and `interventions` for UI
  controls; the Python `SimulatedMerchant` carries `riskScore`, `riskTier`,
  `baseline` only. The ML service never mutates the merchant catalogue.
* `RealMerchant` exists only in TS; Python exposes `MerchantIdentity` for
  documentation and never accepts it in a scoring request.
