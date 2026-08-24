#!/usr/bin/env python3
"""Keep only strict-whitelist Samsung Galaxy phones in MobileCentre scrape JSON files."""

from __future__ import annotations

import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

SCRIPT_ROOT = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_ROOT.parents[3]
SHARED_ROOT = SCRIPT_ROOT.parents[1] / "shared"
DATA_SAMSUNG = REPO_ROOT / "data" / "product-import" / "samsung"
FLAT_FILE = DATA_SAMSUNG / "mobilecentre_samsung_flat_variants.json"
VARIABLE_FILE = DATA_SAMSUNG / "mobilecentre_samsung_variable_products.json"
DEBUG_FILE = DATA_SAMSUNG / "mobilecentre_samsung_scrape_debug.json"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


_scraper = load_module("mobilecentre_scraper", SCRIPT_ROOT / "1.py")
_whitelist = load_module("samsung_whitelist", SHARED_ROOT / "samsung_whitelist.py")


def matches_whitelist(variant: dict) -> bool:
    match = _whitelist.matches_whitelist_variant(
        name=str(variant.get("name", "")),
        model=str(variant.get("model", "")),
        price=variant.get("price"),
        image_url=variant.get("image_url"),
    )
    return match.model is not None


def main() -> None:
    if not FLAT_FILE.exists():
        raise FileNotFoundError(f"Missing {FLAT_FILE}")

    variants = json.loads(FLAT_FILE.read_text(encoding="utf-8"))
    before = len(variants)

    kept = [variant for variant in variants if matches_whitelist(variant)]
    kept.sort(
        key=lambda item: (
            item.get("category", ""),
            item.get("model", ""),
            _scraper.variant_sort_key(item),
        ),
    )

    variable_products = _scraper.build_variable_products(kept)

    FLAT_FILE.write_text(json.dumps(kept, ensure_ascii=False, indent=2), encoding="utf-8")
    VARIABLE_FILE.write_text(json.dumps(variable_products, ensure_ascii=False, indent=2), encoding="utf-8")

    removed = [variant for variant in variants if not matches_whitelist(variant)]
    removed_models = Counter(variant.get("model", "?") for variant in removed)
    removed_reasons: Counter[str] = Counter()

    for variant in removed:
        match = _whitelist.matches_whitelist_variant(
            name=str(variant.get("name", "")),
            model=str(variant.get("model", "")),
            price=variant.get("price"),
            image_url=variant.get("image_url"),
        )
        removed_reasons[match.reason or "unknown"] += 1

    debug = {
        "filtered_by": "samsung_strict_whitelist",
        "flat_variants_before": before,
        "flat_variants": len(kept),
        "variable_products": len(variable_products),
        "removed_variants": before - len(kept),
        "categories": dict(Counter(v.get("category") for v in kept)),
        "whitelist_models": sorted({v.get("model") for v in kept}),
        "removed_models_top": removed_models.most_common(25),
        "removed_reasons": dict(removed_reasons),
    }
    DEBUG_FILE.write_text(json.dumps(debug, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"flat: {before} -> {len(kept)} (removed {before - len(kept)})")
    print(f"variable products: {len(variable_products)}")
    print("kept categories:", debug["categories"])
    print("kept models:", debug["whitelist_models"])
    print("removed reasons:")
    for reason, count in removed_reasons.most_common():
        print(f"  - {reason}: {count}")


if __name__ == "__main__":
    main()
