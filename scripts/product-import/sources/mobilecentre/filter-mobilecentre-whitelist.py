#!/usr/bin/env python3
"""Keep only whitelist Apple products in MobileCentre scrape JSON files."""

from __future__ import annotations

import importlib.util
import json
import re
from collections import Counter
from pathlib import Path

SCRIPT_ROOT = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_ROOT.parents[3]
DATA_APPLE = REPO_ROOT / "data" / "product-import" / "apple"
FLAT_FILE = DATA_APPLE / "mobilecentre_apple_flat_variants.json"
VARIABLE_FILE = DATA_APPLE / "mobilecentre_apple_variable_products.json"
DEBUG_FILE = DATA_APPLE / "mobilecentre_scrape_debug.json"


def normalize(value: str) -> str:
    value = (value or "").lower()
    value = value.replace("‑", "-").replace("–", "-").replace("—", "-")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def haystack(variant: dict) -> str:
    return normalize(f"{variant.get('name', '')} {variant.get('model', '')}")


ALLOWED_NAME_PREFIXES = (
    "apple ",
    "iphone ",
    "ipad ",
    "macbook ",
    "airpods",
    "apple watch",
    "apple tv",
    "homepod",
    "airtag",
    "vision pro",
    "apple vision",
    "studio display",
    "mac mini",
    "mac studio",
    "imac ",
)

# Minimum AMD price for phone SKUs (blocks lens protectors, bumpers, etc.).
IPHONE_MIN_PRICE_AMD = 50_000


# User whitelist — current / target catalog only (no iPhone 14, 13, old Mac M1/M2, etc.)
ALLOW_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"iphone\s*16e\b"),
    re.compile(r"iphone\s*17\s*pro\s*max\b"),
    re.compile(r"iphone\s*17\s*pro\b"),
    re.compile(r"iphone\s*17e\b"),
    re.compile(r"iphone\s*17\s*air\b"),
    re.compile(r"iphone\s*air\b(?!pods)"),
    re.compile(r"iphone\s*17\b(?!e|\s*pro|\s*air)"),
    re.compile(r"iphone\s*18\s*pro\s*max\b"),
    re.compile(r"iphone\s*18\s*pro\b"),
    re.compile(r"iphone\s*18\s*air\b"),
    re.compile(r"iphone\s*18\b(?!e|\s*pro|\s*air)"),
    re.compile(r"macbook\s*air.*13.*\bm4\b"),
    re.compile(r"macbook\s*air.*15.*\bm4\b"),
    re.compile(r"macbook\s*air.*13.*\bm5\b"),
    re.compile(r"macbook\s*air.*15.*\bm5\b"),
    re.compile(r"macbook\s*pro.*14.*\bm5\s*pro\b"),
    re.compile(r"macbook\s*pro.*14.*\bm5\s*max\b"),
    re.compile(r"macbook\s*pro.*14.*\bm5\b(?!.*max)"),
    re.compile(r"macbook\s*pro.*16.*\bm5\s*pro\b"),
    re.compile(r"macbook\s*pro.*16.*\bm5\s*max\b"),
    re.compile(r"mac\s*studio.*2025\b"),
    re.compile(r"mac\s*studio.*\bm5\b"),
    re.compile(r"mac\s*mini.*\bm5\b"),
    re.compile(r"macbook\s*neo\b"),
    re.compile(r"studio\s*display.*2026\b"),
    re.compile(r"studio\s*display\s*xdr\b"),
    re.compile(r"ipad.*11.*(a16|11th|11\s*gen)"),
    re.compile(r"ipad.*11.*air.*\bm3\b"),
    re.compile(r"ipad.*13.*air.*\bm3\b"),
    re.compile(r"ipad.*air.*11.*\bm3\b"),
    re.compile(r"ipad.*air.*13.*\bm3\b"),
    re.compile(r"ipad.*11.*air.*\bm4\b"),
    re.compile(r"ipad.*13.*air.*\bm4\b"),
    re.compile(r"ipad.*air.*11.*\bm4\b"),
    re.compile(r"ipad.*air.*13.*\bm4\b"),
    re.compile(r"ipad\s*pro.*11.*\bm5\b"),
    re.compile(r"ipad\s*pro.*13.*\bm5\b"),
    re.compile(r"ipad\s*mini.*oled\b"),
    re.compile(r"ipad\s*mini\b"),
    re.compile(r"ipad\s*a18\b"),
    re.compile(r"apple\s*watch\s*se\s*3\b"),
    re.compile(r"apple\s*watch\s*series\s*11\b"),
    re.compile(r"apple\s*watch\s*ultra\s*3\b"),
    re.compile(r"apple\s*watch\s*series\s*12\b"),
    re.compile(r"apple\s*watch\s*ultra\s*4\b"),
    re.compile(r"airpods\s*pro\s*3\b"),
    re.compile(r"airpods\s*max\s*2\b"),
    re.compile(r"airpods\s*max\b(?!.*\b1\b)"),
    re.compile(r"airpods\s*ultra\b"),
    re.compile(r"vision\s*pro.*\bm5\b"),
    re.compile(r"apple\s*tv.*4k.*a17\b"),
    re.compile(r"homepod\s*3\b(?!.*mini)"),
    re.compile(r"homepod\s*mini\s*2\b"),
    re.compile(r"homepad\b"),
    re.compile(r"security\s*camera\b"),
    re.compile(r"video\s*doorbell\b"),
    re.compile(r"magic\s*keyboard.*ipad\s*air\b"),
    re.compile(r"magsafe\s*battery\b"),
    re.compile(r"magsafe\s*charger.*25w\b"),
    re.compile(r"magsafe\s*charger.*qi2\b"),
    re.compile(r"airtag\s*2\b"),
]

# Hard blocks even if a loose pattern matched.
BLOCK_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"iphone\s*(1[0-5]|14|15|13|12|11|xr|xs)\b"),
    re.compile(r"iphone\s*16\b(?!e)"),
    re.compile(r"iphone\s*16\s*pro\b"),
    re.compile(r"usb\s*iphone\b"),
    re.compile(r"lightning\s*to\s*type"),
    re.compile(r"green\s*iron\s*shield"),
    re.compile(r"apple\s*watch\s*series\s*(7|8|9|10)\b"),
    re.compile(r"apple\s*watch\s*se\s*2024\b"),
    re.compile(r"apple\s*watch\s*se\b(?!.*\b3\b)"),
    re.compile(r"airtag\s*1\b"),
    re.compile(r"airpods\s*(2|3|4)\b(?!.*pro\s*3)"),
    re.compile(r"airpods\s*pro\s*2\b"),
    re.compile(r"macbook.*\bm1\b"),
    re.compile(r"macbook.*\bm2\b"),
    re.compile(r"imac\s*21"),
    re.compile(r"imac.*\bm3\b"),
    re.compile(r"ipad\s*10\.2\b"),
    re.compile(r"ipad\s*9\b"),
    re.compile(r"guess\b|celly\b|green\s*lion\b|porodo\b|\blevelo\b"),
    re.compile(r"\bbumper\b"),
    re.compile(r"lens\s*protector"),
    re.compile(r"protector\s*glass"),
    re.compile(r"screen\s*protector"),
    re.compile(r"tempered\s*glass"),
    re.compile(r"\bfor\s+iphone\b"),
    re.compile(r"\bfor\s+ipad\b"),
    re.compile(r"\bfor\s+apple\s+watch\b"),
    re.compile(r"\bfor\s+airpods\b"),
]


def is_apple_branded_name(name: str) -> bool:
    norm = normalize(name)
    return any(norm.startswith(prefix) for prefix in ALLOWED_NAME_PREFIXES)


def is_blocked_accessory(variant: dict) -> bool:
    if variant.get("is_accessory"):
        return True

    name = normalize(variant.get("name", ""))
    if name and not is_apple_branded_name(name):
        return True

    text = haystack(variant)
    return any(pattern.search(text) for pattern in BLOCK_PATTERNS)


def matches_whitelist(variant: dict) -> bool:
    if is_blocked_accessory(variant):
        return False

    text = haystack(variant)

    category = normalize(variant.get("category", ""))
    price = variant.get("price")
    if category == "iphone" and isinstance(price, int) and price < IPHONE_MIN_PRICE_AMD:
        return False

    return any(pattern.search(text) for pattern in ALLOW_PATTERNS)


def load_scraper_module():
    spec = importlib.util.spec_from_file_location("scraper", SCRIPT_ROOT / "1.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main() -> None:
    if not FLAT_FILE.exists():
        raise FileNotFoundError(f"Missing {FLAT_FILE}")

    scraper = load_scraper_module()
    variants = json.loads(FLAT_FILE.read_text(encoding="utf-8"))
    before = len(variants)

    kept = [variant for variant in variants if matches_whitelist(variant)]
    kept.sort(
        key=lambda item: (
            item.get("category", ""),
            item.get("model", ""),
            scraper.variant_sort_key(item),
        )
    )

    variable_products = scraper.build_variable_products(kept)

    FLAT_FILE.write_text(json.dumps(kept, ensure_ascii=False, indent=2), encoding="utf-8")
    VARIABLE_FILE.write_text(json.dumps(variable_products, ensure_ascii=False, indent=2), encoding="utf-8")

    removed = [variant for variant in variants if not matches_whitelist(variant)]
    removed_models = Counter(variant.get("model", "?") for variant in removed)
    removed_accessories = [
        {
            "source_pid": variant.get("source_pid"),
            "name": variant.get("name"),
            "model": variant.get("model"),
            "price": variant.get("price"),
        }
        for variant in removed
        if is_blocked_accessory(variant)
    ]

    debug = {
        "filtered_by": "whitelist",
        "flat_variants_before": before,
        "flat_variants": len(kept),
        "variable_products": len(variable_products),
        "removed_variants": before - len(kept),
        "removed_accessories": removed_accessories,
        "categories": dict(Counter(v.get("category") for v in kept)),
        "removed_models_top": removed_models.most_common(25),
    }
    DEBUG_FILE.write_text(json.dumps(debug, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"flat: {before} -> {len(kept)} (removed {before - len(kept)})")
    print(f"variable products: {len(variable_products)}")
    print("kept categories:", debug["categories"])
    print("removed models (top):")
    for model, count in removed_models.most_common(15):
        print(f"  - {model}: {count}")


if __name__ == "__main__":
    main()
