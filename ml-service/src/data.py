"""Deterministic simulated transaction data for SIM-* merchants.

Everything produced here is synthetic. The catalogue of merchants lives in
``backend/src/data/simulated_merchants.json`` so the Express API and this
service agree on identities. Real OpenStreetMap records are never read by this
module; they are display-only directory data.

Labels come from the *scenario parameters* recorded per merchant
(``normal`` | ``drift`` | ``syndicate``) and a fixed injection day. They are
never computed from the features the model sees.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from app import config

CITIES_IN_STATE = [
    ("Bengaluru", "Karnataka"),
    ("Mysuru", "Karnataka"),
    ("Mangaluru", "Karnataka"),
    ("Hubballi", "Karnataka"),
]
CITIES_OUT_OF_STATE = [
    ("New Delhi", "Delhi"),
    ("Mumbai", "Maharashtra"),
    ("Jaipur", "Rajasthan"),
    ("Chandigarh", "Punjab"),
    ("Kolkata", "West Bengal"),
    ("Hyderabad", "Telangana"),
    ("Ahmedabad", "Gujarat"),
]

# The coffee-shop CSV records basket composition only (no amount, no time).
# These per-item prices are ASSUMED demo values, documented in DATASETS.md.
COFFEE_ITEM_PRICES = {
    "Latte": 220, "Hazelnut Latte": 260, "Vanilla Latte": 250,
    "Creamy Aren Latte": 270, "Caramel Latte": 260, "Matcha Latte": 280,
    "Cappuccino": 200, "Caramel Macchiato": 280, "Americano": 180,
    "Matcha Bun": 160, "Cheese Toast": 180, "Chocolate Toast": 190,
    "Butter Toast": 140, "Cookies": 90, "Croissant": 170,
    "Egg Salad Toast": 210, "Fries": 150, "Crispy Chicken Nuggets": 230,
}


@dataclass(frozen=True)
class Merchant:
    id: str
    display_name: str
    category: str
    mcc: str
    mcc_description: str
    declared_turnover_monthly: int
    onboarded_at: str
    baseline_avg_ticket: float
    baseline_night_share: float
    scenario: str  # normal | drift | syndicate
    network: str | None
    is_betting_front: bool


def load_catalog(path: Path | None = None) -> list[Merchant]:
    """Load the shared SIM catalogue (the only source of simulated identities)."""
    source = Path(path) if path else config.SIM_CATALOG_PATH
    with open(source, encoding="utf-8") as handle:
        payload = json.load(handle)
    merchants: list[Merchant] = []
    for row in payload["merchants"]:
        if not str(row["id"]).startswith("SIM-"):
            raise ValueError(f"simulated catalogue contains a non-SIM id: {row['id']}")
        scenario = row["scenario"]
        if scenario == "monitor":
            # 'monitor' is a mild-drift hard negative: it is not an injected
            # typology, so its label is 'normal'. Documented in the model card.
            scenario = "normal"
        merchants.append(
            Merchant(
                id=row["id"],
                display_name=row["displayName"],
                category=row["category"],
                mcc=row["mcc"],
                mcc_description=row["mccDescription"],
                declared_turnover_monthly=row["declaredTurnoverMonthly"],
                onboarded_at=row["onboardedAt"],
                baseline_avg_ticket=float(row["baselineAvgTicket"]),
                baseline_night_share=float(row["baselineNightShare"]),
                scenario=scenario,
                network=row.get("network"),
                is_betting_front=bool(row["isBettingFront"]),
            )
        )
    return merchants


def load_coffee_baskets(path: Path | None = None) -> np.ndarray:
    """Return the monetary value of each basket in ``coffee_shop_transactions.csv``.

    The file has one row per transaction and one 0/1 column per menu item, so the
    basket value is a weighted count using the assumed price table above.
    """
    source = Path(path) if path else config.COFFEE_CSV_PATH
    frame = pd.read_csv(source)
    price_vector = np.array(
        [COFFEE_ITEM_PRICES.get(column, 0) for column in frame.columns[1:]], dtype=float
    )
    matrix = frame.iloc[:, 1:].to_numpy(dtype=float)
    values = matrix @ price_vector
    return values[values > 0]


def _hour_from_range(rng: np.random.Generator, open_hour: int, close_hour: int) -> int:
    span = (close_hour - open_hour) % 24 or 24
    offset = int(rng.integers(0, span))
    return (open_hour + offset) % 24


def _payer_pool(rng: np.random.Generator, merchant: Merchant, size: int = 70) -> list[str]:
    return [f"PYR-{merchant.id[4:]}-{index:04d}" for index in range(size)]


def generate_transactions(
    merchants: list[Merchant] | None = None,
    seed: int | None = None,
    window_end: datetime | None = None,
) -> pd.DataFrame:
    """Generate the full 90-day simulated transaction set.

    Deterministic for a fixed seed: the same seed always yields byte-identical
    records, which the reproducibility test relies on.
    """
    catalogue = merchants if merchants is not None else load_catalog()
    rng = np.random.default_rng(config.SEED if seed is None else seed)
    end = window_end or datetime.combine(config.WINDOW_END, datetime.min.time()).replace(
        hour=23, minute=59
    )

    baskets = load_coffee_baskets()
    shared_payers = [f"PYR-RING-{index:04d}" for index in range(45)]
    records: list[dict] = []

    for merchant in catalogue:
        profile = config.CATEGORY_PROFILES[merchant.category]
        payers = _payer_pool(rng, merchant)
        active_typo = merchant.scenario in {"drift", "syndicate"}
        for day_index in range(config.WINDOW_DAYS):
            day = end - timedelta(days=config.WINDOW_DAYS - 1 - day_index)
            injected = active_typo and day_index >= config.INJECTION_DAY
            multiplier = 1.0
            if injected:
                overlay = (
                    config.SCENARIO_SYNDICATE
                    if merchant.scenario == "syndicate"
                    else config.SCENARIO_DRIFT
                )
                multiplier = overlay["daily_multiplier"]
            elif merchant.scenario == "normal":
                multiplier = config.SCENARIO_MONITOR["daily_multiplier"] if merchant.network is None and day_index >= 70 else 1.0

            count = max(1, int(rng.poisson(profile["daily"] * multiplier)))

            for _ in range(count):
                if injected:
                    overlay = (
                        config.SCENARIO_SYNDICATE
                        if merchant.scenario == "syndicate"
                        else config.SCENARIO_DRIFT
                    )
                    if rng.random() < overlay["round_share"]:
                        amount = float(rng.choice(overlay["round_amounts"]))
                    else:
                        amount = float(
                            rng.lognormal(np.log(profile["ticket"]), profile["sigma"])
                        )
                    start = overlay["night_start_hour"]
                    end_hour = overlay["night_end_hour"]
                    span = (end_hour - start) % 24 or 24
                    hour = (start + int(rng.integers(0, span))) % 24
                    minute = int(rng.integers(0, 60))
                    if overlay.get("shared_payer_pool") and rng.random() < 0.55:
                        payer = shared_payers[int(rng.integers(0, len(shared_payers)))]
                    else:
                        payer = f"PYR-EXT-{int(rng.integers(10000, 99999))}"
                    if rng.random() < overlay["out_of_state_share"]:
                        city, state = CITIES_OUT_OF_STATE[int(rng.integers(0, len(CITIES_OUT_OF_STATE)))]
                    else:
                        city, state = "Bengaluru", "Karnataka"
                else:
                    if merchant.category == "cafe" and baskets.size and rng.random() < 0.6:
                        amount = float(baskets[int(rng.integers(0, baskets.size))])
                    else:
                        amount = float(
                            rng.lognormal(np.log(profile["ticket"]), profile["sigma"])
                        )
                    hour = _hour_from_range(rng, profile["open"], profile["close"])
                    minute = int(rng.integers(0, 60))
                    if rng.random() < profile["repeat"]:
                        payer = payers[int(rng.integers(0, len(payers)))]
                    else:
                        payer = f"PYR-ONE-{int(rng.integers(100000, 999999))}"
                    if rng.random() < 0.94:
                        city, state = "Bengaluru", "Karnataka"
                    else:
                        city, state = CITIES_IN_STATE[int(rng.integers(1, len(CITIES_IN_STATE)))]

                timestamp = day.replace(hour=hour, minute=minute, second=int(rng.integers(0, 60)))
                records.append(
                    {
                        "txnId": f"TXN-{merchant.id[4:]}-{len(records):07d}",
                        "merchantId": merchant.id,
                        "merchantName": merchant.display_name,
                        "category": merchant.category,
                        "mcc": merchant.mcc,
                        "amount": round(amount, 2),
                        "currency": "INR",
                        "paymentMethod": "UPI" if rng.random() < 0.62 else "CREDIT_CARD",
                        "payerId": payer,
                        "payerCity": city,
                        "payerState": state,
                        "timestamp": timestamp,
                        "deviceId": (
                            "DEV-RING-01"
                            if injected and merchant.scenario == "syndicate" and payer.startswith("PYR-RING")
                            else f"DEV-{int(rng.integers(1000, 9999))}"
                        ),
                        "isInjectedTypology": bool(injected),
                        "scenario": merchant.scenario,
                    }
                )

    frame = pd.DataFrame.from_records(records)
    frame["timestamp"] = pd.to_datetime(frame["timestamp"])
    return frame.sort_values(["timestamp", "merchantId"], ignore_index=True)


def build_windows(
    transactions: pd.DataFrame, merchants: list[Merchant] | None = None
) -> pd.DataFrame:
    """Aggregate transactions into merchant × 3-day windows with scenario labels.

    The label for a window is derived from scenario parameters: a window is
    positive when its merchant is a drift/syndicate merchant and the window
    starts on or after the injection day. Features are computed separately in
    ``features.py`` and never read this column.
    """
    catalogue = merchants if merchants is not None else load_catalog()
    scenario_by_id = {m.id: m for m in catalogue}
    frame = transactions.copy()
    frame["windowStart"] = frame["timestamp"].dt.floor(f"{config.WINDOW_DAYS_AGG}D")
    frame["windowSeq"] = (
        (frame["timestamp"].dt.normalize() - frame["timestamp"].dt.normalize().min()).dt.days
        // config.WINDOW_DAYS_AGG
    )

    rows: list[dict] = []
    for (merchant_id, window_seq), group in frame.groupby(["merchantId", "windowSeq"], sort=True):
        merchant = scenario_by_id[merchant_id]
        injected = bool(group["isInjectedTypology"].any())
        positive = merchant.scenario in {"drift", "syndicate"} and injected
        rows.append(
            {
                "merchantId": merchant_id,
                "windowSeq": int(window_seq),
                "windowStart": group["windowStart"].iloc[0],
                "category": merchant.category,
                "mcc": merchant.mcc,
                "scenario": merchant.scenario,
                "label": int(positive),
                "labelSource": "scenario_parameter" if merchant.scenario != "normal" else "normal_control",
                "txnCount": int(len(group)),
                "declaredTurnoverMonthly": merchant.declared_turnover_monthly,
            }
        )
    return pd.DataFrame.from_records(rows).sort_values(["merchantId", "windowSeq"], ignore_index=True)


def deterministic_fingerprint(transactions: pd.DataFrame) -> str:
    """Stable hash of the generated data, used by the reproducibility test."""
    import hashlib

    payload = transactions[
        ["txnId", "merchantId", "amount", "payerId", "timestamp"]
    ].to_csv(index=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
