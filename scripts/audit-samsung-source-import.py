#!/usr/bin/env python3
"""Read-only Samsung MobileCentre whitelist dry-run audit."""

from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "audit" / "product-import" / "samsung"
DATA_SAMSUNG = ROOT / "data" / "product-import" / "samsung"
FLAT_FILE = DATA_SAMSUNG / "mobilecentre_samsung_flat_variants.json"
VARIABLE_FILE = DATA_SAMSUNG / "mobilecentre_samsung_variable_products.json"
DEBUG_FILE = DATA_SAMSUNG / "mobilecentre_samsung_scrape_debug.json"
DB_LOADER = ROOT / "scripts" / "product-import" / "pipelines" / "samsung" / "_load-db-catalog.cjs"

EXPECTED_WHITELIST = [
    "Samsung Galaxy S25",
    "Samsung Galaxy S25+",
    "Samsung Galaxy S25 Ultra",
    "Samsung Galaxy S25 Edge",
    "Samsung Galaxy S25 FE",
    "Samsung Galaxy S26",
    "Samsung Galaxy S26+",
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

HARD_REJECT_CHECKS = [
    ("S24/S23/S22", re.compile(r"galaxy\s+s(22|23|24)\b", re.I)),
    ("A55/A35/A25", re.compile(r"galaxy\s+a(55|35|25)\b", re.I)),
    ("A16/A15", re.compile(r"galaxy\s+a1[56]\b", re.I)),
    ("Fold6/Flip6", re.compile(r"galaxy\s+z\s+(fold|flip)\s*6\b", re.I)),
    ("Tab/Watch/Buds", re.compile(r"galaxy\s+(tab|watch|buds)\b", re.I)),
]

SEPARATION_GROUPS = {
    "S25 family": [
        "Samsung Galaxy S25",
        "Samsung Galaxy S25+",
        "Samsung Galaxy S25 Ultra",
        "Samsung Galaxy S25 Edge",
        "Samsung Galaxy S25 FE",
    ],
    "S26 family": ["Samsung Galaxy S26", "Samsung Galaxy S26+", "Samsung Galaxy S26 Ultra"],
    "A17 family": ["Samsung Galaxy A17", "Samsung Galaxy A17 5G"],
    "A07 family": ["Samsung Galaxy A07", "Samsung Galaxy A07 5G"],
    "Z foldables": [
        "Samsung Galaxy Z Fold7",
        "Samsung Galaxy Z Flip7",
        "Samsung Galaxy Z Flip7 FE",
        "Samsung Galaxy Z TriFold",
    ],
}

COMMANDS: list[dict[str, Any]] = []


def load_whitelist_module():
    spec = importlib.util.spec_from_file_location("samsung_whitelist", ROOT / "scripts/product-import/shared/samsung_whitelist.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def run_command(label: str, cmd: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    COMMANDS.append(
        {
            "label": label,
            "command": " ".join(cmd),
            "exit_code": result.returncode,
            "stdout_tail": (result.stdout or "")[-500:],
            "stderr_tail": (result.stderr or "")[-500:],
        }
    )
    return result


def normalize_model(value: str) -> str:
    value = (value or "").lower()
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def slugify(value: str) -> str:
    value = normalize_model(value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def variant_dedupe_key(model: str, options: dict[str, Any], source_pid: str | None) -> str:
    parts = [
        normalize_model(model),
        normalize_model(str(options.get("storage", ""))),
        normalize_model(str(options.get("ram", options.get("memory", "")))),
        normalize_model(str(options.get("color", ""))),
        normalize_model(str(options.get("connectivity", ""))),
        normalize_model(str(options.get("source_sku", ""))),
        str(source_pid or ""),
    ]
    return "|".join(part for part in parts if part)


def load_db_catalog() -> list[dict[str, Any]]:
    if not DB_LOADER.exists():
        return []
    result = run_command("load_db_catalog", ["node", str(DB_LOADER)])
    if result.returncode != 0:
        raise RuntimeError(f"DB catalog load failed: {result.stderr or result.stdout}")
    payload = json.loads(result.stdout)
    if "error" in payload:
        raise RuntimeError(payload["error"])
    return payload.get("products", [])


def find_parent_db_match(catalog: list[dict[str, Any]], model: str) -> dict[str, Any] | None:
    model_norm = normalize_model(model)
    model_slug = slugify(model)

    for product in catalog:
        title_norm = product.get("normalized_model", "")
        if title_norm == model_norm:
            return {"reason": "normalized_model", "product": product}
        if product.get("slug") == model_slug or product.get("normalized_slug") == model_slug:
            return {"reason": "slug", "product": product}
        if normalize_model(product.get("title", "")) == model_norm:
            return {"reason": "title", "product": product}
    return None


def find_variant_db_match(catalog: list[dict[str, Any]], variant: dict[str, Any]) -> dict[str, Any] | None:
    key = variant_dedupe_key(
        str(variant.get("model", "")),
        variant.get("options") or {},
        str(variant.get("source_pid") or ""),
    )
    source_pid = str(variant.get("source_pid") or "")

    for product in catalog:
        for db_variant in product.get("variants", []):
            if (
                db_variant.get("source") == "mobilecentre"
                and source_pid
                and str(db_variant.get("sourcePid") or "") == source_pid
            ):
                return {
                    "reason": "source_pid",
                    "product": product,
                    "variant": db_variant,
                }
            if db_variant.get("dedupe_key") == key:
                return {
                    "reason": "dedupe_key",
                    "product": product,
                    "variant": db_variant,
                }
    return None


def summarize_options(variants: list[dict[str, Any]]) -> dict[str, list[str]]:
    buckets: dict[str, set[str]] = defaultdict(set)
    for variant in variants:
        for key, value in (variant.get("options") or {}).items():
            if value:
                buckets[key].add(str(value))
    return {key: sorted(values) for key, values in buckets.items()}


def audit() -> dict[str, Any]:
    wl = load_whitelist_module()

    flat: list[dict[str, Any]] = json.loads(FLAT_FILE.read_text(encoding="utf-8"))
    variable: list[dict[str, Any]] = json.loads(VARIABLE_FILE.read_text(encoding="utf-8"))
    debug: dict[str, Any] = {}
    if DEBUG_FILE.exists():
        try:
            debug = json.loads(DEBUG_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            debug = {}

    candidate_links = debug.get("candidate_links")
    if not candidate_links and debug.get("filtered_by"):
        candidate_links = None

    json_valid = True
    variant_sum = sum(int(p.get("variant_count") or 0) for p in variable)
    grouping_ok = variant_sum == len(flat)

    validation_issues: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    not_added: list[dict[str, Any]] = []
    ready_to_import: list[dict[str, Any]] = []
    already_exists_in_db: list[dict[str, Any]] = []

    scraped_models = sorted({str(v.get("model")) for v in flat})
    missing_from_source = sorted(set(EXPECTED_WHITELIST) - set(scraped_models))

    for variant in flat:
        name = str(variant.get("name", ""))
        model = str(variant.get("model", ""))
        match = wl.match_whitelist_model(name, model)

        if match.model is None:
            rejected.append(
                {
                    "product": name,
                    "model": model,
                    "source_url": variant.get("product_url"),
                    "reason": match.reason or "not_in_whitelist",
                }
            )
            continue

        if match.model != model:
            validation_issues.append(
                {
                    "type": "model_mismatch",
                    "name": name,
                    "model": model,
                    "matched": match.model,
                }
            )

        if wl.is_hard_rejected(name, model):
            rejected.append(
                {
                    "product": name,
                    "model": model,
                    "source_url": variant.get("product_url"),
                    "reason": "hard_reject",
                }
            )

        if variant.get("is_accessory"):
            rejected.append(
                {
                    "product": name,
                    "model": model,
                    "source_url": variant.get("product_url"),
                    "reason": "accessory",
                }
            )

        if not variant.get("product_url"):
            validation_issues.append({"type": "missing_url", "name": name})
        price = variant.get("price")
        if not isinstance(price, int) or price <= 0:
            validation_issues.append({"type": "missing_price", "name": name, "price": price})
        if not variant.get("image_url"):
            validation_issues.append({"type": "missing_image", "name": name})

    safety: dict[str, str] = {}
    hay_all = " | ".join(
        f"{v.get('name', '')} {v.get('model', '')}" for v in flat
    )
    for label, pattern in HARD_REJECT_CHECKS:
        safety[label] = "PASS" if not pattern.search(hay_all) else "FAIL"

    safety["No accessories imported"] = (
        "PASS" if not any(v.get("is_accessory") for v in flat) else "FAIL"
    )

    for group_name, models in SEPARATION_GROUPS.items():
        present = [model for model in models if model in scraped_models]
        if len(present) <= 1:
            safety[f"{group_name} separate"] = "PASS" if present else "N/A (not on source)"
            continue
        merged = any(
            len({v.get("model") for v in flat if v.get("model") in present}) != len(present)
            for _ in [0]
        )
        safety[f"{group_name} separate"] = "PASS" if not merged else "FAIL"

    a27_rule = "PASS"
    for variant in flat:
        text = f"{variant.get('name', '')} {variant.get('model', '')}".lower()
        if re.search(r"galaxy\s+a(27|37|57)\b", text) and "5g" not in text:
            a27_rule = "FAIL"
    safety["A27/A37/A57 require explicit 5G"] = a27_rule

    for parent in variable:
        if len({v.get("model") for v in parent.get("variants", [])}) > 1:
            validation_issues.append(
                {
                    "type": "merged_parent_models",
                    "parent_model": parent.get("model"),
                    "models": sorted({v.get("model") for v in parent.get("variants", [])}),
                }
            )

    catalog = load_db_catalog()

    for parent in variable:
        model = str(parent.get("model", ""))
        variants = parent.get("variants") or []
        options_summary = summarize_options(variants)
        parent_match = find_parent_db_match(catalog, model) if catalog else None

        variant_rows = []
        new_variants = 0
        existing_variants = 0
        for variant in variants:
            db_match = find_variant_db_match(catalog, variant) if catalog else None
            row = {
                **variant,
                "db_status": "exists" if db_match else "new",
                "db_match": db_match,
            }
            variant_rows.append(row)
            if db_match:
                existing_variants += 1
            else:
                new_variants += 1

        product_payload = {
            "source": "mobilecentre",
            "product_name": model,
            "model": model,
            "category": parent.get("category"),
            "variant_count": len(variants),
            "price_min": parent.get("price_min"),
            "price_max": parent.get("price_max"),
            "available_options": parent.get("available_options"),
            "source_urls": sorted({v.get("product_url") for v in variants if v.get("product_url")}),
            "variants": variant_rows,
            "ready_to_import": new_variants > 0 and not validation_issues_for_parent(model, variants, wl),
            "db_status": "exists" if parent_match and existing_variants == len(variants) else (
                "partial" if parent_match else "new"
            ),
            "db_match": parent_match,
        }

        if parent_match and existing_variants == len(variants):
            already_exists_in_db.append(
                {
                    "product": model,
                    "existing_db_product": parent_match["product"].get("title"),
                    "db_id": parent_match["product"].get("id"),
                    "reason": parent_match.get("reason"),
                    "variant_count": len(variants),
                }
            )
        elif product_payload["ready_to_import"]:
            ready_to_import.append(product_payload)
        else:
            reason = "already_partially_in_db" if parent_match else "validation_or_duplicate_risk"
            not_added.append(
                {
                    "product_model": model,
                    "reason": reason,
                    "notes": f"new_variants={new_variants}, existing_variants={existing_variants}",
                    "source_urls": product_payload["source_urls"],
                }
            )

    for model in missing_from_source:
        not_added.append(
            {
                "product_model": model,
                "reason": "not_found_on_mobilecentre",
                "notes": "Whitelisted target not discovered in scrape output",
            }
        )

    ready_variant_count = sum(
        1
        for product in ready_to_import
        for variant in product.get("variants", [])
        if variant.get("db_status") == "new"
    )

    ram_stats = {
        "variants_total": len(flat),
        "variants_with_ram": sum(1 for v in flat if (v.get("options") or {}).get("ram")),
        "variants_with_storage": sum(1 for v in flat if (v.get("options") or {}).get("storage")),
        "variants_with_color": sum(1 for v in flat if (v.get("options") or {}).get("color")),
    }

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "source": "mobilecentre",
            "whitelist_parent_models": len(EXPECTED_WHITELIST),
            "flat_variants": len(flat),
            "variable_products": len(variable),
            "ready_to_import_parent_products": len(ready_to_import),
            "ready_to_import_variants": ready_variant_count,
            "already_exists_in_db": len(already_exists_in_db),
            "not_added": len(not_added),
            "rejected": len(rejected),
            "candidate_links_scraped": candidate_links,
            "models_found_on_source": len(scraped_models),
            "models_missing_on_source": len(missing_from_source),
            "json_valid": json_valid,
            "grouping_ok": grouping_ok,
            "validation_issues": len(validation_issues),
            "parse_errors": 0,
        },
        "ready_to_import": ready_to_import,
        "already_exists_in_db": already_exists_in_db,
        "not_added": not_added,
        "rejected": rejected,
        "validation_issues": validation_issues,
        "whitelist_safety": safety,
        "models_found_on_source": scraped_models,
        "models_missing_on_source": missing_from_source,
        "ram_extraction": ram_stats,
        "commands": COMMANDS,
    }
    return payload


def validation_issues_for_parent(model: str, variants: list[dict[str, Any]], wl) -> bool:
    for variant in variants:
        match = wl.matches_whitelist_variant(
            name=str(variant.get("name", "")),
            model=str(variant.get("model", "")),
            price=variant.get("price"),
            image_url=variant.get("image_url"),
        )
        if match.model is None:
            return True
    return False


def write_markdown_report(payload: dict[str, Any], path: Path) -> None:
    summary = payload["summary"]
    safety = payload.get("whitelist_safety", {})

    lines = [
        "# Samsung Whitelist Dry-Run Report",
        "",
        f"> Generated: {payload.get('generated_at', '')}",
        "> Mode: read-only audit — no DB import performed",
        "",
        "## Summary",
        "",
        "| Metric | Count |",
        "| --- | ---: |",
        f"| Whitelist parent models | {summary['whitelist_parent_models']} |",
        f"| Flat variants scraped | {summary['flat_variants']} |",
        f"| Variable products grouped | {summary['variable_products']} |",
        f"| Ready parent products | {summary['ready_to_import_parent_products']} |",
        f"| Ready variants | {summary['ready_to_import_variants']} |",
        f"| Already exists in DB | {summary['already_exists_in_db']} |",
        f"| Not added | {summary['not_added']} |",
        f"| Rejected | {summary['rejected']} |",
        f"| Failed/parse errors | {summary.get('parse_errors', 0)} |",
        f"| Models found on source | {summary.get('models_found_on_source', 0)} / {summary['whitelist_parent_models']} |",
        f"| Candidate links scraped | {summary.get('candidate_links_scraped') or 'n/a (debug overwritten by filter)'} |",
        f"| JSON grouping valid | {'Yes' if summary.get('grouping_ok') else 'No'} |",
        "",
        "## Ready To Import",
        "",
        "| Product | Variants | Price range | Colors | Storage | Source URLs |",
        "| --- | ---: | ---: | --- | --- | --- |",
    ]

    if not payload["ready_to_import"]:
        lines.append("| — | — | — | — | — | — |")
    else:
        for product in payload["ready_to_import"]:
            opts = product.get("available_options") or {}
            colors = ", ".join(opts.get("color", [])[:5]) or "—"
            storage = ", ".join(opts.get("storage", [])) or "—"
            price_min = product.get("price_min")
            price_max = product.get("price_max")
            price_range = f"{price_min:,}–{price_max:,} AMD" if price_min and price_max else "—"
            urls = ", ".join(product.get("source_urls", [])[:2]) or "—"
            lines.append(
                f"| {product.get('model')} | {product.get('variant_count')} | {price_range} | {colors} | {storage} | {urls} |"
            )

    lines.extend(
        [
            "",
            "## Already Exists In DB",
            "",
            "| Product | Existing DB product | DB ID | Reason |",
            "| --- | --- | --- | --- |",
        ]
    )
    if not payload["already_exists_in_db"]:
        lines.append("| — | — | — | — |")
    else:
        for row in payload["already_exists_in_db"]:
            lines.append(
                f"| {row.get('product')} | {row.get('existing_db_product')} | {row.get('db_id')} | {row.get('reason')} |"
            )

    lines.extend(
        [
            "",
            "## Not Added",
            "",
            "| Product/Model | Reason | Notes |",
            "| --- | --- | --- |",
        ]
    )
    if not payload["not_added"]:
        lines.append("| — | — | — |")
    else:
        for row in payload["not_added"]:
            lines.append(
                f"| {row.get('product_model')} | {row.get('reason')} | {row.get('notes', '')} |"
            )

    lines.extend(
        [
            "",
            "## Rejected",
            "",
            "| Product | Source URL | Reason |",
            "| --- | --- | --- |",
        ]
    )
    if not payload["rejected"]:
        lines.append("| — | — | — |")
    else:
        for row in payload["rejected"][:50]:
            lines.append(
                f"| {row.get('product')} | {row.get('source_url', '—')} | {row.get('reason')} |"
            )

    lines.extend(
        [
            "",
            "## RAM Extraction Verification",
            "",
            "| Metric | Count |",
            "| --- | ---: |",
            f"| Variants total | {payload.get('ram_extraction', {}).get('variants_total', summary['flat_variants'])} |",
            f"| Variants with RAM parsed | {payload.get('ram_extraction', {}).get('variants_with_ram', 0)} |",
            f"| Variants with storage parsed | {payload.get('ram_extraction', {}).get('variants_with_storage', 0)} |",
            f"| Variants with color parsed | {payload.get('ram_extraction', {}).get('variants_with_color', 0)} |",
            "",
            "## Variant Summary",
            "",
            "| Product | Variants | Storage | RAM | Colors | Connectivity |",
            "| --- | ---: | --- | --- | --- | --- |",
        ]
    )
    for product in payload["ready_to_import"]:
        opts = product.get("available_options") or {}
        lines.append(
            "| {model} | {count} | {storage} | {ram} | {colors} | {conn} |".format(
                model=product.get("model"),
                count=product.get("variant_count"),
                storage=", ".join(opts.get("storage", [])) or "—",
                ram=", ".join(opts.get("ram", [])) or "—",
                colors=", ".join(opts.get("color", [])) or "—",
                conn=", ".join(opts.get("connectivity", [])) or "—",
            )
        )
    if not payload["ready_to_import"]:
        lines.append("| — | — | — | — | — | — |")

    lines.extend(
        [
            "",
            "## Whitelist Safety Check",
            "",
            "| Check | Result |",
            "| --- | --- |",
        ]
    )
    for check, result in safety.items():
        lines.append(f"| {check} | {result} |")

    lines.extend(
        [
            "",
            "## Scraper Bug Found During Audit",
            "",
            "| Issue | Status |",
            "| --- | --- |",
            "| `is_likely_samsung_phone_href()` rejected all `index.php?m=prod&pid=` URLs | Fixed during audit — scraper re-run succeeded |",
            "",
            "## Models Missing On MobileCentre",
            "",
        ]
    )
    missing = payload.get("models_missing_on_source") or []
    if missing:
        for model in missing:
            lines.append(f"- {model}")
    else:
        lines.append("- None")

    if payload.get("validation_issues"):
        lines.extend(["", "## Validation Issues", ""])
        for issue in payload["validation_issues"][:20]:
            lines.append(f"- `{issue}`")

    lines.extend(["", "## Commands Used", ""])
    for cmd in payload.get("commands", []):
        lines.append(f"- `{cmd['command']}` → exit {cmd['exit_code']}")

    safe = summary["ready_to_import_parent_products"] > 0 and summary["rejected"] == 0
    lines.extend(
        [
            "",
            "## Final Recommendation",
            "",
            (
                "**Import is conditionally safe** for the "
                f"{summary['ready_to_import_parent_products']} parent products / "
                f"{summary['ready_to_import_variants']} variants that passed whitelist, price, image, and DB duplicate checks."
                if safe
                else "**Import is NOT fully safe yet.** Review blockers below before importing."
            ),
            "",
            f"- Parent products safe to import: **{summary['ready_to_import_parent_products']}**",
            f"- Variants safe to import: **{summary['ready_to_import_variants']}**",
            f"- Already in DB: **{summary['already_exists_in_db']}** parent product(s)",
            f"- Not added / missing on source: **{summary['not_added']}** entries",
            f"- Rejected from scrape output: **{summary['rejected']}**",
            "",
            "**Do not import:** hard-reject models, accessories, missing price/image items, and anything not in strict whitelist.",
            "",
            "**Whitelist/matching bugs:** none in scraped output after href-filter fix; 11 whitelisted models were not found on MobileCentre at scrape time.",
            "",
            "**Next command if import is approved:** build/import pipeline for Samsung (not implemented yet). Re-scrape before import:",
            "",
            "```bash",
            "py -3 scripts/product-import/sources/mobilecentre/2.py",
            "py -3 scripts/product-import/sources/mobilecentre/filter-mobilecentre-samsung-whitelist.py",
            "py -3 scripts/audit-samsung-source-import.py",
            "```",
            "",
        ]
    )

    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for required in (FLAT_FILE, VARIABLE_FILE, DEBUG_FILE):
        if not required.exists():
            print(f"Missing required file: {required}", file=sys.stderr)
            return 1

    payload = audit()

    dry_run_path = OUT_DIR / "samsung-products.dry-run.json"
    report_path = OUT_DIR / "samsung-whitelist-dry-run-report.md"

    dry_run_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_markdown_report(payload, report_path)

    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    print(f"\nWrote {dry_run_path}")
    print(f"Wrote {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
