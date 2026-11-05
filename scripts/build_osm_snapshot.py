"""Merge per-category Overpass responses into a single snapshot the backend can load."""
import json
import os
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(REPO_ROOT, "osm_raw")
OUT = os.path.join(REPO_ROOT, "backend", "src", "data", "osm_raw_snapshot.json")

# NOTE: scripts/normalize_osm.py is now the single source of truth for the
# shipped OSM dataset. This script is kept for merging per-category Overpass
# responses collected by backend's osm:sync into a raw snapshot.
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


def main() -> None:
    categories = {}
    total = 0
    for key in CATEGORY_ORDER:
        path = os.path.join(RAW_DIR, f"{key}.json")
        if not os.path.exists(path):
            print(f"WARN missing {key}.json")
            continue
        with open(path, encoding="utf-8") as fh:
            payload = json.load(fh)
        elements = payload.get("elements")
        if not isinstance(elements, list):
            print(f"WARN {key}.json is not an Overpass response, skipping")
            continue
        categories[key] = {"elements": elements}
        total += len(elements)
        print(f"{key}: {len(elements)} elements")

    snapshot = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "bbox": "12.93,77.56,13.02,77.65",
        "city": "Bengaluru",
        "state": "Karnataka",
        "source": "OpenStreetMap",
        "license": "ODbL-1.0",
        "attribution": "© OpenStreetMap contributors",
        "totalElements": total,
        "categories": categories,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, ensure_ascii=False, indent=2)
    print(f"\nWrote {OUT} ({total} elements across {len(categories)} categories)")


if __name__ == "__main__":
    main()
