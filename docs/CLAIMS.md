# Claim validation register

Rule used here: **VALIDATED** means a command or artifact produced in this
repository during this task shows the claim. **NOT VALIDATED** means no such
evidence exists; the claim was removed or explicitly marked in the UI, never
buried in a footnote.

## Claims removed or rewritten

| Claim | Location (before) | Evidence | Status | Action |
| --- | --- | --- | --- | --- |
| "exposes covert betting syndicates with **96%+ confidence**" | `README.md`, `PlatformOverviewModal.tsx` | None. No test or artifact measures betting-front detection on real data. | NOT VALIDATED | Removed from README; modal now states real-world performance is NOT VALIDATED |
| "**99.4% false-positive immunity** for legitimate merchants" | `README.md`, `PlatformOverviewModal.tsx` | None. No false-positive study exists. | NOT VALIDATED | Removed |
| "**96.2% Syndicate Detection Accuracy**" | `README.md` KPI block | None. | NOT VALIDATED | Removed |
| "**42 ms Telemetry Latency**" | `README.md` KPI block | No latency benchmark was run. | NOT VALIDATED | Removed; README says no latency SLO is claimed |
| "**100% Court-Admissible Documentation**" | `README.md`, `PlatformOverviewModal.tsx` | Nothing in this repo produces a filing; the AI report is a demo narrative. | NOT VALIDATED | Removed; UI describes a simulated investigation note that is not a legal finding |
| "13.8x velocity spike", "₹48.5 Lakhs/month", "68% between 22:30 and 02:00", "3.6% repeat rate", "94% local patrons" | `README.md` narrative | These were hand-written scenario numbers; the simulator's actual parameters are 3.1x volume, night-share 0.42, payer retention 0.04, out-of-state share 0.86 (`SCENARIO_PARAMETERS`). | NOT VALIDATED | Narrative replaced with the simulator parameters that actually exist in code |
| "5-Dimensional Drift Engine (W1=0.25 …)" weight table | `README.md` | The implemented `driftEngine.ts` components are temporal 0.24, spatial 0.20, amount 0.20, payer 0.16, baseline 0.20. | NOT VALIDATED (as written) | README documents the implemented weights |
| "**Ground-Truth Merchant Verification**: OpenStreetMap (OSM)" | `README.md` heading | OSM provides identities, not ground truth about fraud. Risk labels are synthetic. | NOT VALIDATED | Replaced with a real/simulated separation table and a "display only" statement |
| "18 OSM Verified Merchants", "8 Categories" | footer / UI copy | Observed dataset is **360** shops in **9** categories (`normalize_osm.py` output). | NOT VALIDATED (as written) | Replaced with measured counts |
| Trained on AMLSim / PaySim / BankSim / MoMTSim | older `ml-service/DATASETS.md` prose | None of those rows were loaded; see `ml-service/docs/DATASETS.md`. | NOT VALIDATED | Old file deleted; the new doc states training provenance explicitly |
| `/api/osm/shops` covers "eight categories" | `ApiDocsConfig.tsx` | 9 categories incl. café. | NOT VALIDATED (as written) | Corrected to nine |

## Claims kept, with evidence

| Claim | Location | Evidence (command / artifact) | Status | Action |
| --- | --- | --- | --- | --- |
| Real OSM ids are rejected by every risk-bearing route with HTTP 409 | `docs/API_CONTRACT.md`, README | `scripts/smoke.ps1` asserts 409 on `/api/risk/merchant/OSM-*`, `/api/transactions?merchantId=OSM-*`, `/api/simulator/run` with a real id, `/api/ai/investigate/OSM-*` | VALIDATED | Documented |
| Real merchants carry no risk field anywhere | types, API, UI | `grep -nE "riskScore\|riskTier\|fraud\|betting\|intervention" backend/src/data/merchantsData.ts` returns nothing; `GET /api/merchants?origin=real_osm` response checked in smoke script | VALIDATED | Documented |
| Every financial record uses a `SIM-*` id | types + Pydantic + API | `Transaction.merchantId: SimMerchantId`; `SIM_ID_PATTERN` in `app/schemas.py`; ML returns 422 for non-`SIM-*` | VALIDATED | Documented |
| Syndicate graph contains simulated nodes only | `/api/syndicate/graph` | smoke script scans every node id for the `SIM-`/`CLUSTER-`/`HUB-`/`INFRA-` prefixes and fails on any `OSM-` id | VALIDATED | Documented |
| OSM dataset: 360 shops, 40 cafés, deterministic | `scripts/normalize_osm.py` | `total shops: 360`, `cafes: 40`; two runs → identical SHA-256 `83117c94…eb21de` for `osm_shops.json`, `cmp` byte-identical | VALIDATED | README + OSM section |
| Nine categories including café (MCC 5814) | `osmService.ts`, frontend | category counts printed by the normalizer (40 per category) and `npm run build` | VALIDATED | Documented |
| Model metrics on synthetic evaluation | README metric table, `artifacts/metrics.json`, `/api/ml/model/info` | `train.py` run: time holdout n=80 pos=24 P/R/F1=1.00, ROC-AUC 1.00; merchant holdout n=120 pos=12 same | VALIDATED — **synthetic evaluation only** | Labelled as synthetic everywhere |
| Training is reproducible with a fixed seed | `train.py` | seed 20261104; two consecutive runs produce the same fingerprint `0bb4bcfb10fa3a63` and 15,537 / 420 / 48 counts | VALIDATED | Documented |
| Python environment is 3.11 with no broken requirements | `check_env.py`, `pip check` | `python --version` → 3.11.9; `check_env.py` → `ENVIRONMENT CHECK: OK`; `pip check` → `No broken requirements found.` | VALIDATED | Documented |
| Test suite passes | `ml-service/tests` | `pytest ml-service/tests -q` → 42 passed | VALIDATED | Documented |
| Express proxies ML with a timeout and a clear offline error | `/api/ml/*` | proxy returns 502 `ML_SERVICE_UNAVAILABLE` when `ML_SERVICE_URL` is unreachable; smoke script exercises it | VALIDATED | Documented |
| Frontend builds | build | `npm run build` exit 0, 2069 modules | VALIDATED | Documented |
| Benchmarks, throughput, latency SLOs | — | none measured | NOT VALIDATED | README states no SLO is claimed |
| Production fraud-detection performance | — | no real fraud labels used | NOT VALIDATED | Stated in README limitations and in the model card |
| AMLSim was built and run | `ml-service/docs/DATASETS.md` | `mvn` not installed; AMLSim targets Java 8, only Java 26 present → not built | NOT VALIDATED | Doc records the failure instead of a run |
| PaySim / BankSim / MoMTSim licences | `ml-service/docs/DATASETS.md` | Taken from public listings; no licence file was opened for these three | NOT VALIDATED as verified | Doc marks them "listing only"; only AMLSim's Apache-2.0 is verified from its `LICENSE` |
| OSM data licence | README, `osm_shops.json` metadata | ODbL-1.0 per OSM's published licence; attribution string written by the normalizer | VALIDATED (declared licence) | Attribution shown in README and API metadata |
