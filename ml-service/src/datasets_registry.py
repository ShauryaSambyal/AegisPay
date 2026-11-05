"""Dataset provenance registry surfaced by ``GET /datasets`` and the model card.

Numbers marked ``measured`` were produced by the commands recorded in
``ml-service/docs/DATASETS.md`` and ``docs/EXECUTION_LOG.md``. Anything not
measured in this repository is explicitly reported as unavailable.
"""

from __future__ import annotations

import os
from pathlib import Path

from app import config

AMLSIM_DIR = config.EXTERNAL_DATA_DIR / "AMLSim"


def _license_head(path: Path, limit: int = 220) -> str | None:
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8", errors="replace")
    return " ".join(text.split())[:limit]


def _exists(path: Path) -> bool:
    return path.exists()


def dataset_entries() -> list[dict]:
    """Structured access/licence status for every dataset the project considered."""
    amlsim_license = _license_head(AMLSIM_DIR / "LICENSE")
    return [
        {
            "name": "AMLSim",
            "canonicalUrl": "https://github.com/IBM/AMLSim",
            "access": "cloned locally into ml-service/data/external/AMLSim (gitignored)",
            "localPath": "ml-service/data/external/AMLSim",
            "available": _exists(AMLSIM_DIR),
            "license": "Apache-2.0",
            "licenseEvidence": amlsim_license,
            "schema": "nodes.csv(nodeid,isFraud,init_balance,fraudStep); transactions.csv(source,target,value,time); alerts per typology",
            "modelsMerchantsOrMcc": False,
            "usedForTraining": False,
            "usedFor": "graph typology research and cycle-detection reference only",
        },
        {
            "name": "PaySim",
            "canonicalUrl": "https://www.kaggle.com/datasets/ealaxi/paysim1",
            "access": (
                "local gitignored copy present; the Kaggle API download redirects to a login wall "
                "(302 without credentials), so the exact download route was not re-verified here"
            ),
            "localPath": "ml-service/datasets/PaySim/paysim_train.parquet",
            "available": _exists(config.SERVICE_ROOT / "datasets" / "PaySim" / "paysim_train.parquet"),
            "license": "CC BY-SA 4.0 (Kaggle listing, not verified by download in this task)",
            "licenseEvidence": None,
            "schema": "step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,oldbalanceDest,newbalanceDest,isFraud,isFlaggedFraud",
            "observedShape": "4,790,000 rows x 11 columns; isFraud=1 in 3,849 rows; steps 1-345",
            "modelsMerchantsOrMcc": False,
            "usedForTraining": False,
            "usedFor": "not used for training in this build",
        },
        {
            "name": "BankSim",
            "canonicalUrl": "https://www.kaggle.com/datasets/ealaxi/banksim1",
            "access": "Kaggle requires an authenticated account/API key; not downloaded in this environment",
            "localPath": None,
            "available": False,
            "license": "CC BY-SA 4.0 (upstream listing, not verified by download here)",
            "licenseEvidence": None,
            "schema": "synthetic bank payments with customer, merchant, age, gender, zip, category, amount, fraud label",
            "modelsMerchantsOrMcc": True,
            "usedForTraining": False,
            "usedFor": "not used",
        },
        {
            "name": "MoMTSim",
            "canonicalUrl": "https://data.mendeley.com/datasets/zhj366m53p/2",
            "access": "local gitignored CSV copy present; the Mendeley page answers 200 but the file download is a manual step",
            "localPath": "ml-service/datasets/MoMTSim/synthetic_mobile_money_transaction_dataset.csv",
            "available": _exists(
                config.SERVICE_ROOT / "datasets" / "MoMTSim" / "synthetic_mobile_money_transaction_dataset.csv"
            ),
            "license": "CC BY 4.0 (Mendeley listing, not verified by download in this task)",
            "licenseEvidence": None,
            "schema": "step,transactionType,amount,initiator,oldBalInitiator,newBalInitiator,recipient,oldBalRecipient,newBalRecipient,isFraud",
            "observedShape": "1,720,181 rows x 10 columns; isFraud=1 in 175,518 rows",
            "modelsMerchantsOrMcc": False,
            "usedForTraining": False,
            "usedFor": "not used for training in this build",
        },
        {
            "name": "coffee_shop_transactions.csv",
            "canonicalUrl": "repository file",
            "access": "bundled in the repository",
            "localPath": "coffee_shop_transactions.csv",
            "available": _exists(config.COFFEE_CSV_PATH),
            "license": "not stated in the repository; treated as demo input",
            "licenseEvidence": None,
            "schema": "TransactionID + 18 binary menu-item columns (basket composition only, no amount, no timestamp)",
            "modelsMerchantsOrMcc": False,
            "usedForTraining": True,
            "usedFor": "café basket composition for simulated amount sampling (assumed unit prices)",
        },
        {
            "name": "AegisPay simulated world",
            "canonicalUrl": "generated by ml-service/src/data.py",
            "access": "deterministic generator, seed 20261104",
            "localPath": "generated in memory",
            "available": True,
            "license": "project-internal synthetic data",
            "licenseEvidence": None,
            "schema": "SIM-* transactions + merchant-window labels from scenario parameters",
            "modelsMerchantsOrMcc": True,
            "usedForTraining": True,
            "usedFor": "primary training and evaluation data",
        },
    ]


def environment_notes() -> dict:
    return {
        "repoRoot": str(config.REPO_ROOT),
        "externalDataDir": str(config.EXTERNAL_DATA_DIR),
        "externalDataPresent": os.path.isdir(config.EXTERNAL_DATA_DIR),
        "noRealOsmInTraining": True,
    }
