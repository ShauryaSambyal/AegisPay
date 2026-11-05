# Dataset provenance and access record

Everything in this file was observed in this repository on 2026-11-05 by the
commands shown. Where a dataset could not be obtained, that is stated instead of
implying it was used.

**Training data provenance in one sentence:** the shipped model is trained only
on the deterministic simulated `SIM-*` world in `ml-service/src/data.py` plus
`coffee_shop_transactions.csv` for café basket composition. **No** AMLSim,
PaySim, BankSim or MoMTSim rows were used for training in this build.

## Access summary

| Dataset | Canonical URL | Observed access result | Local path | Licence (source of claim) | Used for training |
| --- | --- | --- | --- | --- | --- |
| AMLSim | https://github.com/IBM/AMLSim | `git clone` succeeded; HTTP 200 for the repo page; `LICENSE` present locally | `ml-service/data/external/AMLSim` (gitignored) | Apache-2.0 — read from the `LICENSE` file: first lines are "Apache License / Version 2.0, January 2004" | No |
| PaySim | https://www.kaggle.com/datasets/ealaxi/paysim1 | Dataset page HTTP 200; Kaggle API download without credentials returns **302** (login/API-key wall). A gitignored local copy exists at the path on the right | `ml-service/datasets/PaySim/paysim_train.parquet` (gitignored) | CC BY-SA 4.0 — **Kaggle listing only, not verified by a download performed in this task** | No |
| BankSim | https://www.kaggle.com/datasets/ealaxi/banksim1 | Dataset page HTTP 200; Kaggle API download is behind the same login/API-key wall. No local copy | — | CC BY-SA 4.0 — Kaggle listing only, not verified here | No |
| MoMTSim | https://data.mendeley.com/datasets/zhj366m53p/2 | Page HTTP 200; Mendeley download is a manual click-through, not scripted here. A gitignored local CSV exists | `ml-service/datasets/MoMTSim/synthetic_mobile_money_transaction_dataset.csv` (gitignored) | CC BY 4.0 — Mendeley listing only, not verified here | No |
| coffee_shop_transactions.csv | repository file | Present, 1,000 data rows + header | `coffee_shop_transactions.csv` | Not stated in the repository; treated as demo input | Yes (basket composition only) |
| Simulated world (`SIM-*`) | generated | Deterministic, seed 20261104 | in memory | project-internal synthetic data | Yes (primary) |

Commands used for the HTTP checks:

```
curl -s -o /dev/null -w "%{http_code}" -L --max-time 25 <url>   # 200 for all four URLs
curl -s -o /dev/null -w "%{http_code}" --max-time 20 https://www.kaggle.com/api/v1/datasets/download/ealaxi/paysim1
# -> 302 (redirect to login)
```

## Observed schemas and sizes

Measured by reading the local files, not from documentation:

```
PAYSIM   (4790000, 11)
         step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,
         oldbalanceDest,newbalanceDest,isFraud,isFlaggedFraud
         isFraud=1: 3,849    steps: 1..345    types: CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER

MOMTSIM  (1720181, 10)
         step,transactionType,amount,initiator,oldBalInitiator,newBalInitiator,
         recipient,oldBalRecipient,newBalRecipient,isFraud
         isFraud=1: 175,518

AMLSIM   nodes.csv        (20000, 4)  nodeid,isFraud,init_balance,fraudStep   fraud nodes: 945
         transactions.csv (117805, 4) sourceNodeId,targetNodeId,value,time    value range 10.11..599.91
```

## AMLSim build attempt

* Toolchain declared by AMLSim's own `README.md`: **Java 8**, dependency jars
  placed in `jars/`, Python 3.7 for the graph generator (`grep` of the README).
* Observed toolchain on this machine: `java version "26.0.2"` is installed;
  **`mvn` is not installed** (`mvn: command not found`); the system Python is
  3.14.6, while this project runs on a Python 3.11.9 venv.
* Result: the Java simulator was **not built or run** in this task. AMLSim
  declares Java 8; only Java 26 is available, and Maven is missing. Rather than
  claim a run, the project used AMLSim's *published sample output*
  (`generated/20K_cycle200`, shipped inside the repository sample archive) to
  read schemas and cycle typologies.
* Consequence: AMLSim labels are **account-level SAR/typology labels**, not
  merchant-category or betting labels. They cannot be used as ground truth for
  this project and were not used for training.

## What this project actually uses

1. **Primary training and evaluation:** the deterministic simulator in
   `ml-service/src/data.py`. Labels come from scenario parameters
   (`normal` | `drift` | `syndicate`) plus a fixed injection day — never from a
   feature the model sees.
2. **Auxiliary:** `coffee_shop_transactions.csv` provides basket composition for
   café transactions. The file has **no amount and no timestamp column**; the
   per-item prices used to convert a basket into an amount are **assumed demo
   values** listed in `src/data.py` (`COFFEE_ITEM_PRICES`). This is a modelling
   assumption, not a measurement.
3. **Not used:** AMLSim, PaySim, BankSim, MoMTSim. They are inspected for schema
   and licence only. `GET /api/ml/datasets` reports the same status to the UI.

## Known limitations of the datasets considered

* **PaySim** is a single synthetic mobile-money month (345 hourly steps). It has
  no merchant category, no merchant identity and no calendar dates. Fraud exists
  only in `TRANSFER` and `CASH_OUT`. `isFlaggedFraud` is a rule output, not
  ground truth.
* **BankSim** is synthetic bank payments with a `category` column, but no
  merchant-purpose drift and no betting typology.
* **MoMTSim** is synthetic mobile money with a very high positive rate
  (175,518 / 1,720,181 ≈ 10.2%), which does not resemble production fraud base
  rates and has no merchant-category dimension.
* **AMLSim** models bank accounts and AML typologies (cycles, fan-in/fan-out).
  It has no merchants and no MCCs; its value scale (10–600) is arbitrary.
* None of the four contains a **verified real-world betting-front label**.

## Licence caution

Licence values for PaySim, BankSim and MoMTSim come from their public listing
pages and were **not** verified by opening a downloaded licence file in this
task. AMLSim's Apache-2.0 claim *is* verified from its bundled `LICENSE`. No
dataset file is committed to this repository; `ml-service/datasets/` and
`ml-service/data/external/` are gitignored.
