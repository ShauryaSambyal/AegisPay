"""Normalize the Bengaluru OpenStreetMap dump into the dataset the app ships.

Single source of truth for OSM data:

    osm_expanded_raw.json  --(this script)-->  osm_shops.json
                                               backend/src/data/osm_shops.json
                                               backend/src/data/osm_raw_snapshot.json

Rules:
  * deduplicate by (osm type, osm id);
  * require a name and valid coordinates;
  * map tags to the nine supported categories (amenity=cafe -> cafe);
  * pick a deterministic, category-balanced 100-500 shops sorted by type/id;
  * write byte-identical normalized copies and a raw snapshot.

The output contains NO risk data of any kind: it is directory data published on
OpenStreetMap under ODbL-1.0, © OpenStreetMap contributors.

Usage (from the repository root):
    .\\ml-service\\.venv\\Scripts\\python.exe scripts\\normalize_osm.py
Optional:
    --per-category 40     shops kept per category (default 40 -> 360 total)
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = REPO_ROOT / "osm_expanded_raw.json"
ROOT_OUT = REPO_ROOT / "osm_shops.json"
BACKEND_OUT = REPO_ROOT / "backend" / "src" / "data" / "osm_shops.json"
RAW_SNAPSHOT_OUT = REPO_ROOT / "backend" / "src" / "data" / "osm_raw_snapshot.json"

CITY = "Bengaluru"
STATE = "Karnataka"
BBOX = "12.93,77.56,13.02,77.65"
SOURCE = "OpenStreetMap"
LICENSE = "ODbL-1.0"
ATTRIBUTION = "© OpenStreetMap contributors"

# (tag key, tag value) -> category key. Order of the values matters only for
# documentation; selection is driven by CATEGORY_ORDER.
CATEGORY_RULES: dict[tuple[str, str], str] = {
    ("shop", "bakery"): "bakery",
    ("shop", "pastry"): "bakery",
    ("shop", "confectionery"): "bakery",
    ("shop", "chocolate"): "bakery",
    ("amenity", "restaurant"): "restaurant",
    ("amenity", "cafe"): "cafe",          # cafés: amenity=cafe, MCC 5814
    ("shop", "coffee"): "cafe",
    ("shop", "supermarket"): "grocery",
    ("amenity", "pharmacy"): "pharmacy",
    ("shop", "chemist"): "pharmacy",
    ("shop", "electronics"): "electronics",
    ("shop", "clothes"): "clothing",
    ("tourism", "hotel"): "hotel",
    ("shop", "convenience"): "convenience",
}

CATEGORY_ORDER = [
    "bakery",
    "restaurant",
    "cafe",
    "grocery",
    "pharmacy",
    "electronics",
    "clothing",
    "hotel",
    "convenience",
]

# MCC is the card-acceptor category shown next to a shop. 5814 covers cafés,
# coffee shops and fast food, which is why amenity=cafe maps to it instead of a
# retail-shop category.
CATEGORY_META = {
    "bakery": ("Bakery", "5462", "Retail Bakeries & Pastry Shops"),
    "restaurant": ("Restaurant", "5812", "Eating Places & Restaurants"),
    "cafe": ("Café", "5814", "Cafés, Coffee Shops & Fast Food"),
    "grocery": ("Grocery Store", "5411", "Grocery Stores & Supermarkets"),
    "pharmacy": ("Pharmacy", "5912", "Drug Stores & Pharmacies"),
    "electronics": ("Electronics", "5732", "Electronics Stores"),
    "clothing": ("Clothing", "5651", "Family Clothing Stores"),
    "hotel": ("Hotel", "7011", "Hotels & Motels"),
    "convenience": ("Convenience Store", "5499", "Miscellaneous Food Stores"),
}


def category_of(tags: dict) -> str | None:
    for (key, value), category in CATEGORY_RULES.items():
        if tags.get(key) == value:
            return category
    return None


def coordinates(element: dict) -> tuple[float, float] | None:
    if "lat" in element and "lon" in element:
        return float(element["lat"]), float(element["lon"])
    center = element.get("center")
    if isinstance(center, dict) and "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])
    return None


def build_address(tags: dict) -> str:
    parts: list[str] = []
    housenumber = tags.get("addr:housenumber")
    street = tags.get("addr:street")
    if housenumber and street:
        parts.append(f"{housenumber} {street}")
    elif street:
        parts.append(street)
    elif tags.get("addr:full"):
        parts.append(tags["addr:full"])

    for key in ("addr:suburb", "addr:city"):
        value = tags.get(key)
        if value and value not in parts:
            parts.append(value)
    postcode = tags.get("addr:postcode")
    if postcode:
        parts.append(postcode)

    if not parts:
        return f"{CITY}, {STATE} (address not published on OpenStreetMap)"
    if CITY.lower() not in " ".join(parts).lower():
        parts.append(CITY)
    if STATE.lower() not in " ".join(parts).lower():
        parts.append(STATE)
    return ", ".join(parts)


def normalize(per_category: int) -> dict:
    with open(SOURCE_PATH, encoding="utf-8") as handle:
        payload = json.load(handle)
    elements = payload.get("elements") if isinstance(payload, dict) else payload
    if not isinstance(elements, list):
        raise SystemExit(f"{SOURCE_PATH} is not an Overpass response")

    timestamp = "unknown"
    if isinstance(payload, dict):
        timestamp = (
            payload.get("osm3s", {}).get("timestamp_osm_base")
            or payload.get("generatedAt")
            or timestamp
        )

    seen: set[tuple[str, int]] = set()
    by_category: dict[str, list[tuple[str, int, dict]]] = defaultdict(list)
    skipped_unnamed = 0
    skipped_nocoords = 0

    for element in elements:
        osm_type = element.get("type")
        osm_id = element.get("id")
        if osm_type not in {"node", "way", "relation"} or not isinstance(osm_id, int):
            continue
        key = (osm_type, osm_id)
        if key in seen:
            continue
        seen.add(key)

        tags = element.get("tags") or {}
        name = (tags.get("name") or "").strip()
        if not name:
            skipped_unnamed += 1
            continue
        point = coordinates(element)
        if point is None:
            skipped_nocoords += 1
            continue
        category = category_of(tags)
        if category is None:
            continue
        by_category[category].append((osm_type, osm_id, {**element, "_point": point}))

    selected: list[tuple[str, int, dict, str]] = []
    for category in CATEGORY_ORDER:
        candidates = sorted(by_category.get(category, []), key=lambda item: (item[0], item[1]))
        for osm_type, osm_id, element in candidates[:per_category]:
            selected.append((osm_type, osm_id, element, category))

    selected.sort(key=lambda item: (item[0], item[1]))

    shops = []
    raw_categories: dict[str, dict] = {}
    for osm_type, osm_id, element, category in selected:
        tags = element.get("tags") or {}
        latitude, longitude = element["_point"]
        label, mcc, mcc_description = CATEGORY_META[category]
        shop = {
            "osmType": osm_type,
            "osmId": osm_id,
            "osmRef": f"{osm_type}/{osm_id}",
            "category": category,
            "categoryLabel": label,
            "name": tags["name"].strip(),
            "address": build_address(tags),
            "latitude": round(latitude, 7),
            "longitude": round(longitude, 7),
            "mcc": mcc,
            "mccDescription": mcc_description,
            "businessType": label,
            "source": SOURCE,
            "license": LICENSE,
            "attribution": ATTRIBUTION,
        }
        for tag_key, field in (
            ("addr:postcode", "postcode"),
            ("addr:street", "street"),
            ("opening_hours", "openingHours"),
            ("brand", "brand"),
        ):
            if tags.get(tag_key):
                shop[field] = tags[tag_key]
        shops.append(shop)
        raw_categories.setdefault(category, {"elements": []})["elements"].append(
            {
                "type": osm_type,
                "id": osm_id,
                "lat": round(latitude, 7),
                "lon": round(longitude, 7),
                "tags": tags,
            }
        )

    if not 100 <= len(shops) <= 500:
        raise SystemExit(f"selection produced {len(shops)} shops; expected 100-500")

    dataset = {
        "generatedAt": timestamp,
        "city": CITY,
        "state": STATE,
        "bbox": BBOX,
        "source": SOURCE,
        "license": LICENSE,
        "attribution": ATTRIBUTION,
        "count": len(shops),
        "categories": {key: sum(1 for shop in shops if shop["category"] == key) for key in CATEGORY_ORDER},
        "selectionRule": (
            f"first {per_category} named, geocoded shops per category, sorted by OSM type/id"
        ),
        "skipped": {"unnamed": skipped_unnamed, "withoutCoordinates": skipped_nocoords},
        "shops": shops,
    }

    snapshot = {
        "generatedAt": timestamp,
        "bbox": BBOX,
        "city": CITY,
        "state": STATE,
        "source": SOURCE,
        "license": LICENSE,
        "attribution": ATTRIBUTION,
        "totalElements": len(shops),
        "categories": {key: raw_categories[key] for key in CATEGORY_ORDER if key in raw_categories},
    }
    return {"dataset": dataset, "snapshot": snapshot}


def write_json(path: Path, payload: dict) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize the Bengaluru OSM dump")
    parser.add_argument("--per-category", type=int, default=40)
    args = parser.parse_args()

    result = normalize(args.per_category)
    root_hash = write_json(ROOT_OUT, result["dataset"])
    backend_hash = write_json(BACKEND_OUT, result["dataset"])
    write_json(RAW_SNAPSHOT_OUT, result["snapshot"])

    dataset = result["dataset"]
    print(f"total shops        : {dataset['count']}")
    print(f"cafés              : {dataset['categories'].get('cafe', 0)}")
    print(f"skipped unnamed    : {dataset['skipped']['unnamed']}")
    print(f"skipped no coords  : {dataset['skipped']['withoutCoordinates']}")
    print(f"categories         : {json.dumps(dataset['categories'])}")
    print(f"{ROOT_OUT.name:<22} sha256={root_hash}")
    print(f"backend copy           sha256={backend_hash}")
    print(f"copies identical   : {root_hash == backend_hash}")
    print(f"raw snapshot       : {RAW_SNAPSHOT_OUT}")
    return 0 if root_hash == backend_hash else 1


if __name__ == "__main__":
    raise SystemExit(main())
