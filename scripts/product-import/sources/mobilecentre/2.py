#!/usr/bin/env python3
"""Scrape MobileCentre Samsung Galaxy phones with strict whitelist filtering."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse

SCRIPT_ROOT = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_ROOT.parents[3]
SHARED_ROOT = SCRIPT_ROOT.parents[1] / "shared"
DATA_SAMSUNG = REPO_ROOT / "data" / "product-import" / "samsung"

OUTPUT_FLAT = str(DATA_SAMSUNG / "mobilecentre_samsung_flat_variants.json")
OUTPUT_VARIABLE = str(DATA_SAMSUNG / "mobilecentre_samsung_variable_products.json")
OUTPUT_DEBUG = str(DATA_SAMSUNG / "mobilecentre_samsung_scrape_debug.json")

REQUEST_SLEEP_SEARCH = 0.15
REQUEST_SLEEP_PRODUCT = 0.15
MAX_VARIANTS_PER_SEED = 120

SEARCH_QUERIES = [
    "Samsung Galaxy",
    "Samsung Galaxy S25",
    "Samsung Galaxy S25 Ultra",
    "Samsung Galaxy S25+",
    "Samsung Galaxy S25 Edge",
    "Samsung Galaxy S25 FE",
    "Samsung Galaxy S26",
    "Samsung Galaxy S26 Ultra",
    "Samsung Galaxy A26 5G",
    "Samsung Galaxy A36 5G",
    "Samsung Galaxy A56 5G",
    "Samsung Galaxy A17",
    "Samsung Galaxy A17 5G",
    "Samsung Galaxy A07",
    "Samsung Galaxy A06 5G",
    "Samsung Galaxy A27 5G",
    "Samsung Galaxy A37 5G",
    "Samsung Galaxy A57 5G",
    "Samsung Galaxy A07 5G",
    "Samsung Galaxy Z Fold7",
    "Samsung Galaxy Z Flip7",
    "Samsung Galaxy Z Flip7 FE",
    "Samsung Galaxy Z TriFold",
]

SAMSUNG_PRODUCT_SLUG_HINTS = (
    "samsung-",
    "galaxy-s",
    "galaxy-a",
    "galaxy-z",
    "galaxy-fold",
    "galaxy-flip",
)

SAMSUNG_COLOR_ALIASES = {
    "phantom black": "Phantom Black",
    "graphite": "Graphite",
    "cream": "Cream",
    "lavender": "Lavender",
    "mint": "Mint",
    "navy": "Navy",
    "silver shadow": "Silver Shadow",
    "silver": "Silver",
    "black": "Black",
    "white": "White",
    "blue": "Blue",
    "green": "Green",
    "pink": "Pink",
    "purple": "Purple",
    "gold": "Gold",
    "gray": "Gray",
    "grey": "Gray",
    "titanium black": "Titanium Black",
    "titanium gray": "Titanium Gray",
    "titanium grey": "Titanium Gray",
    "titanium silver": "Titanium Silver",
    "titanium blue": "Titanium Blue",
    "coral red": "Coral Red",
    "icy blue": "Icy Blue",
    "lime": "Lime",
    "orange": "Orange",
    "yellow": "Yellow",
}


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


_scraper = load_module("mobilecentre_scraper", SCRIPT_ROOT / "1.py")
_whitelist = load_module("samsung_whitelist", SHARED_ROOT / "samsung_whitelist.py")

BASE_URL = _scraper.BASE_URL
clean_text = _scraper.clean_text
normalize = _scraper.normalize
get_html = _scraper.get_html
canonical_product_url = _scraper.canonical_product_url
extract_source_pid = _scraper.extract_source_pid
normalize_product_pid = _scraper.normalize_product_pid
variant_dedupe_key = _scraper.variant_dedupe_key
strip_related_html = _scraper.strip_related_html
extract_product_links_from_html = _scraper.extract_product_links_from_html
find_next_page_urls = _scraper.find_next_page_urls
extract_price = _scraper.extract_price
extract_name = _scraper.extract_name
is_valid_product_image = _scraper.is_valid_product_image
extract_all_image_urls = _scraper.extract_all_image_urls
extract_product_description_fields = _scraper.extract_product_description_fields
build_variable_products = _scraper.build_variable_products
unique_keep_order = _scraper.unique_keep_order
variant_sort_key = _scraper.variant_sort_key


def title_color(value: str) -> str:
    key = normalize(value)
    if key in SAMSUNG_COLOR_ALIASES:
        return SAMSUNG_COLOR_ALIASES[key]
    return " ".join(word.capitalize() for word in clean_text(value).split())


def extract_color_from_name(name: str) -> str | None:
    clean = clean_text(name)
    name_norm = normalize(clean)

    parens = re.findall(r"\(([^()]*)\)", clean)
    for value in reversed(parens):
        value_clean = clean_text(value)
        value_norm = normalize(value_clean)
        if re.fullmatch(r"[A-Z0-9/-]{4,12}", value_clean.replace("/", ""), re.IGNORECASE):
            continue
        if value_norm in SAMSUNG_COLOR_ALIASES or len(value_clean.split()) <= 4:
            return title_color(value_clean)

    trailing = re.search(r"\)[\s_-]+([A-Za-z]+(?:\s+[A-Za-z]+){0,3})$", clean)
    if trailing:
        candidate = trailing.group(1)
        if normalize(candidate) in SAMSUNG_COLOR_ALIASES:
            return title_color(candidate)

    for color_key in sorted(SAMSUNG_COLOR_ALIASES.keys(), key=len, reverse=True):
        if re.search(rf"\b{re.escape(color_key)}\b", name_norm):
            return SAMSUNG_COLOR_ALIASES[color_key]

    return None


def extract_ram_storage_from_slash(name: str) -> tuple[str | None, str | None]:
    match = re.search(
        r"\b(4|6|8|12|16)\s*GB\s*/\s*(64|128|256|512)\s*GB\b",
        name,
        re.IGNORECASE,
    )
    if match:
        return f"{match.group(1)}GB", f"{match.group(2)}GB"

    match = re.search(r"\b(16)\s*GB\s*/\s*1\s*TB\b", name, re.IGNORECASE)
    if match:
        return "16GB", "1TB"

    return None, None


def extract_storage(name: str) -> str | None:
    _ram, storage = extract_ram_storage_from_slash(name)
    if storage:
        return storage

    match = re.search(r"\b(64|128|256|512)\s*GB\b|\b1\s*TB\b", name, re.IGNORECASE)
    if not match:
        return None
    token = match.group(0).upper().replace(" ", "")
    if token.endswith("TB"):
        return "1TB"
    return token


def extract_ram(name: str, description: str = "") -> str | None:
    ram, _storage = extract_ram_storage_from_slash(name)
    if ram:
        return ram

    hay = f"{name} {description}"
    match = re.search(r"\b(4|6|8|12|16)\s*GB\s*(?:RAM|Memory)\b", hay, re.IGNORECASE)
    if match:
        return f"{match.group(1)}GB"
    match = re.search(r"\bRAM\s*[:\-]?\s*(4|6|8|12|16)\s*GB\b", hay, re.IGNORECASE)
    if match:
        return f"{match.group(1)}GB"
    return None


def extract_connectivity(name: str, description: str = "") -> str | None:
    hay = normalize(f"{name} {description}")
    if re.search(r"\b5g\b", hay):
        return "5G"
    if re.search(r"\b4g\b|\blte\b", hay):
        return "4G"
    return None


def extract_sim_options(name: str, description: str = "") -> str | None:
    hay = normalize(f"{name} {description}")
    if "dual esim" in hay:
        return "Dual eSIM"
    if "nano sim" in hay and "esim" in hay:
        return "Nano-SIM + eSIM"
    if "dual sim" in hay:
        return "Dual SIM"
    if "esim" in hay:
        return "eSIM"
    return None


def extract_processor(name: str, description: str = "") -> str | None:
    hay = f"{name} {description}"
    match = re.search(
        r"\b(Snapdragon\s+\d+(?:\s+for\s+Galaxy)?|Exynos\s+\d+|Dimensity\s+\d+)\b",
        hay,
        re.IGNORECASE,
    )
    if match:
        return clean_text(match.group(1))
    return None


def extract_source_sku(name: str, description: str = "") -> str | None:
    hay = f"{name} {description}"
    match = re.search(r"\b(SM-[A-Z0-9]{2,10}|SM[A-Z0-9]{2,10})\b", hay, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return None


def extract_variant_options(name: str, description: str = "") -> dict[str, str]:
    options: dict[str, str] = {}

    color = extract_color_from_name(name)
    if color:
        options["color"] = color

    ram, storage = extract_ram_storage_from_slash(name)
    if storage:
        options["storage"] = storage
    else:
        storage = extract_storage(name)
        if storage:
            options["storage"] = storage

    if ram:
        options["ram"] = ram
    else:
        ram = extract_ram(name, description)
        if ram:
            options["ram"] = ram

    connectivity = extract_connectivity(name, description)
    if connectivity:
        options["connectivity"] = connectivity

    sim = extract_sim_options(name, description)
    if sim:
        options["sim"] = sim

    processor = extract_processor(name, description)
    if processor:
        options["processor"] = processor

    sku = extract_source_sku(name, description)
    if sku:
        options["source_sku"] = sku

    return options


def detect_category(model: str) -> str:
    model_norm = normalize(model)
    if re.search(r"\bgalaxy\s+s\d", model_norm):
        return "Galaxy S"
    if re.search(r"\bgalaxy\s+a\d", model_norm):
        return "Galaxy A"
    if re.search(r"\bgalaxy\s+z", model_norm):
        return "Galaxy Z"
    return "Samsung Phone"


def is_likely_samsung_phone_href(url: str) -> bool:
    parsed = urlparse(urljoin(BASE_URL, url))
    path = parsed.path.lower()
    query = parse_qs(parsed.query)

    pid = query.get("pid", [None])[0]
    module = query.get("m", [None])[0]
    if pid and module == "prod":
        return True

    if "/product/" not in path:
        return False

    slug = path.split("/product/", 1)[-1].lower()
    return any(hint in slug for hint in SAMSUNG_PRODUCT_SLUG_HINTS)


def scrape_search_results(query: str) -> list[str]:
    start_url = f"{BASE_URL}/search/?searchData={quote_plus(query)}"
    urls_to_visit = [start_url]
    visited: set[str] = set()
    product_links: set[str] = set()

    while urls_to_visit:
        url = urls_to_visit.pop(0)
        if url in visited:
            continue
        visited.add(url)

        try:
            html = get_html(url)
        except Exception as error:
            print(f"  Search page error: {url} -> {error}")
            continue

        for link in extract_product_links_from_html(html, url):
            if is_likely_samsung_phone_href(link):
                product_links.add(link)

        for next_url in find_next_page_urls(html, url):
            if next_url not in visited and next_url not in urls_to_visit:
                urls_to_visit.append(next_url)

        time.sleep(REQUEST_SLEEP_SEARCH)

    return sorted(product_links)


def extract_variant_links_from_html(html: str, current_url: str) -> list[str]:
    top_html = strip_related_html(html)
    for marker in [
        "Ավելի մանրամասն",
        "Ընդհանուր բնութագրեր",
        "Արտադրանքի նկարագրություն",
    ]:
        if marker in top_html:
            top_html = top_html.split(marker, 1)[0]
            break

    links: set[str] = set()
    seed = canonical_product_url(current_url)
    if seed:
        links.add(seed)

    for link in extract_product_links_from_html(top_html, current_url):
        if is_likely_samsung_phone_href(link):
            links.add(link)

    return sorted(links)


def parse_product_page(product_url: str) -> tuple[dict[str, Any] | None, str, list[str]]:
    html = get_html(product_url)
    product_html = strip_related_html(html)
    soup = _scraper.BeautifulSoup(product_html, "lxml")
    page_text = clean_text(soup.get_text(" "))

    name = extract_name(soup)
    if not name:
        return None, html, []

    whitelist_match = _whitelist.match_whitelist_model(name)
    if whitelist_match.model is None:
        return None, html, []

    model = whitelist_match.model
    description_raw, description_html = extract_product_description_fields(soup)
    options = extract_variant_options(name, description_raw)
    category = detect_category(model)
    is_accessory = _whitelist.is_accessory_product(name, model)

    gallery = extract_all_image_urls(soup)
    image_url = gallery[0] if gallery else None
    price = extract_price(page_text)

    validation = _whitelist.matches_whitelist_variant(
        name=name,
        model=model,
        price=price,
        image_url=image_url,
    )
    if validation.model is None:
        return None, html, []

    visible_id = None
    visible_id_match = re.search(r"\bID\s*:\s*([\d,]+)", page_text)
    if visible_id_match:
        visible_id = visible_id_match.group(1)

    source_pid = extract_source_pid(product_url, page_text)
    canonical_url = canonical_product_url(product_url) or product_url

    variant = {
        "source": "mobilecentre",
        "source_pid": source_pid,
        "visible_id": visible_id,
        "id": f"mobilecentre:{source_pid or visible_id or canonical_url}",
        "name": name,
        "model": model,
        "category": category,
        "is_accessory": is_accessory,
        "options": options,
        "price": price,
        "currency": "AMD",
        "image_url": image_url,
        "gallery": gallery,
        "product_url": canonical_url,
        "description": description_raw,
        "descriptionRaw": description_raw,
        "descriptionHtml": description_html,
    }

    page_links = extract_variant_links_from_html(html, product_url)
    return variant, html, page_links


def same_variable_model(seed: dict[str, Any], candidate: dict[str, Any]) -> bool:
    seed_model = seed.get("model", "")
    candidate_model = candidate.get("model", "")
    return _whitelist.same_parent_model(seed_model, candidate_model)


def scrape_product_with_variants(seed_url: str, global_seen_urls: set[str]) -> list[dict[str, Any]]:
    seed_canonical = canonical_product_url(seed_url)
    if not seed_canonical:
        return []

    queue = [seed_canonical]
    local_seen_urls: set[str] = set()
    local_seen_pids: set[str] = set()
    variants: list[dict[str, Any]] = []
    seed_variant: dict[str, Any] | None = None

    while queue and len(local_seen_urls) < MAX_VARIANTS_PER_SEED:
        url = queue.pop(0)
        canonical = canonical_product_url(url)
        if not canonical:
            continue

        pid = normalize_product_pid(extract_source_pid(canonical, ""))
        if pid and pid in local_seen_pids:
            continue
        if canonical in local_seen_urls:
            continue
        local_seen_urls.add(canonical)
        if canonical in global_seen_urls and canonical != seed_canonical:
            continue

        try:
            variant, _html, links = parse_product_page(canonical)
        except Exception as error:
            print(f"  Product parse error: {canonical} -> {error}")
            continue

        global_seen_urls.add(canonical)
        if not variant:
            continue

        if pid:
            local_seen_pids.add(pid)
        if seed_variant is None:
            seed_variant = variant
        if not same_variable_model(seed_variant, variant):
            continue

        variants.append(variant)

        for link in links:
            link_canonical = canonical_product_url(link)
            if not link_canonical:
                continue
            link_pid = normalize_product_pid(extract_source_pid(link_canonical, ""))
            if link_pid and link_pid in local_seen_pids:
                continue
            if link_canonical in local_seen_urls or link_canonical in queue:
                continue
            if len(queue) + len(local_seen_urls) < MAX_VARIANTS_PER_SEED:
                queue.append(link_canonical)

        time.sleep(REQUEST_SLEEP_PRODUCT)

    deduped: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for variant in variants:
        key = variant_dedupe_key(variant)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped.append(variant)

    return deduped


def main() -> None:
    global REQUEST_SLEEP_PRODUCT, REQUEST_SLEEP_SEARCH

    parser = argparse.ArgumentParser(
        description="Scrape MobileCentre Samsung Galaxy phones (strict whitelist).",
    )
    parser.add_argument("--url", help="Scrape one MobileCentre product URL and its variants.")
    parser.add_argument(
        "--sleep-product",
        type=float,
        default=REQUEST_SLEEP_PRODUCT,
        help=f"Pause between product page requests in seconds. Default: {REQUEST_SLEEP_PRODUCT}",
    )
    parser.add_argument(
        "--sleep-search",
        type=float,
        default=REQUEST_SLEEP_SEARCH,
        help=f"Pause between search page requests in seconds. Default: {REQUEST_SLEEP_SEARCH}",
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Minimal pauses (0.05s). Use if the site responds reliably; may increase 429/block risk.",
    )
    parser.add_argument(
        "--reparse-json",
        action="store_true",
        help="Re-extract variant options from existing flat JSON (no network).",
    )
    args = parser.parse_args()

    if args.reparse_json:
        flat_path = Path(OUTPUT_FLAT)
        if not flat_path.exists():
            raise FileNotFoundError(f"Missing {OUTPUT_FLAT} for --reparse-json")

        flat_variants = json.loads(flat_path.read_text(encoding="utf-8"))
        for variant in flat_variants:
            description = variant.get("description") or variant.get("descriptionRaw") or ""
            variant["options"] = extract_variant_options(variant.get("name", ""), description)

        deduped = flat_variants
        variable_products = build_variable_products(deduped)

        Path(OUTPUT_FLAT).write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")
        Path(OUTPUT_VARIABLE).write_text(
            json.dumps(variable_products, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        debug = {
            "mode": "reparse-json",
            "flat_variants": len(deduped),
            "variable_products": len(variable_products),
            "whitelist_models": sorted({item.get("model") for item in deduped}),
            "outputs": [OUTPUT_FLAT, OUTPUT_VARIABLE],
        }
        Path(OUTPUT_DEBUG).write_text(json.dumps(debug, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Reparsed flat variants: {len(deduped)}")
        print(f"Variable products: {len(variable_products)}")
        return

    if args.fast:
        REQUEST_SLEEP_PRODUCT = 0.05
        REQUEST_SLEEP_SEARCH = 0.05
    else:
        REQUEST_SLEEP_PRODUCT = max(0.0, args.sleep_product)
        REQUEST_SLEEP_SEARCH = max(0.0, args.sleep_search)

    candidate_links: set[str] = set()

    if args.url:
        canonical = canonical_product_url(args.url)
        if not canonical:
            raise ValueError(f"Not a product URL: {args.url}")
        candidate_links.add(canonical)
    else:
        for index, query in enumerate(SEARCH_QUERIES, start=1):
            print(f"[SEARCH {index}/{len(SEARCH_QUERIES)}] {query}")
            links = scrape_search_results(query)
            print(f"  Found product links: {len(links)}")
            candidate_links.update(links)
            time.sleep(REQUEST_SLEEP_SEARCH)

    print("")
    print(f"Total unique candidate links: {len(candidate_links)}")
    print("")

    flat_variants: list[dict[str, Any]] = []
    global_seen_urls: set[str] = set()
    rejected_reasons: dict[str, int] = defaultdict(int)

    for index, url in enumerate(sorted(candidate_links), start=1):
        if url in global_seen_urls:
            continue

        print(f"[SEED {index}/{len(candidate_links)}] {url}")
        variants = scrape_product_with_variants(url, global_seen_urls)
        print(f"  Variants collected: {len(variants)}")
        flat_variants.extend(variants)

    deduped: list[dict[str, Any]] = []
    seen_variant_keys: set[str] = set()
    for variant in flat_variants:
        key = variant_dedupe_key(variant)
        if key in seen_variant_keys:
            continue
        seen_variant_keys.add(key)
        deduped.append(variant)

    deduped.sort(
        key=lambda item: (
            item.get("category", ""),
            item.get("model", ""),
            variant_sort_key(item),
        ),
    )
    variable_products = build_variable_products(deduped)

    Path(OUTPUT_FLAT).write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")
    Path(OUTPUT_VARIABLE).write_text(
        json.dumps(variable_products, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    debug = {
        "candidate_links": len(candidate_links),
        "flat_variants": len(deduped),
        "variable_products": len(variable_products),
        "whitelist_models": sorted({item.get("model") for item in deduped}),
        "rejected_reasons": dict(rejected_reasons),
        "outputs": [OUTPUT_FLAT, OUTPUT_VARIABLE],
    }
    Path(OUTPUT_DEBUG).write_text(json.dumps(debug, ensure_ascii=False, indent=2), encoding="utf-8")

    print("")
    print("Done.")
    print(f"Flat variants: {len(deduped)} -> {OUTPUT_FLAT}")
    print(f"Variable products: {len(variable_products)} -> {OUTPUT_VARIABLE}")
    print(f"Debug: {OUTPUT_DEBUG}")


if __name__ == "__main__":
    main()
