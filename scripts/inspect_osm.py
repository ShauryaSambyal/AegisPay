import json
import glob
import os

for path in sorted(glob.glob(r"D:\Hackathon\osm_raw\*.json")):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    elements = data.get("elements", [])
    print(f"\n== {os.path.basename(path)} ({len(elements)}) ==")
    for el in elements:
        tags = el.get("tags", {})
        addr = " ".join(
            filter(
                None,
                [
                    tags.get("addr:housenumber"),
                    tags.get("addr:street"),
                    tags.get("addr:suburb"),
                ],
            )
        )
        print(
            f"  {el['type']}/{el['id']} | {tags.get('name', '(no name)')} | "
            f"{addr[:60]} | phone={tags.get('phone', '-')} | web={tags.get('website', '-')}"
        )
