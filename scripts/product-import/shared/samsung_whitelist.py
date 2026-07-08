"""Strict Samsung Galaxy phone whitelist for MobileCentre import."""

from __future__ import annotations

import re
from typing import NamedTuple

SAMSUNG_PHONE_WHITELIST: tuple[str, ...] = (
    # Galaxy S — 2025
    "Samsung Galaxy S25 Ultra",
    "Samsung Galaxy S25 Edge",
    "Samsung Galaxy S25 FE",
    "Samsung Galaxy S25+",
    "Samsung Galaxy S25",
    # Galaxy S — 2026
    "Samsung Galaxy S26 Ultra",
    "Samsung Galaxy S26+",
    "Samsung Galaxy S26",
    # Galaxy A — 2025
    "Samsung Galaxy A56 5G",
    "Samsung Galaxy A36 5G",
    "Samsung Galaxy A26 5G",
    "Samsung Galaxy A06",
    "Samsung Galaxy A06 5G",
    "Samsung Galaxy A17 5G",
    "Samsung Galaxy A17",
    "Samsung Galaxy A07",
    "Samsung Galaxy A16",
    "Samsung Galaxy A26",
    "Samsung Galaxy A27",
    "Samsung Galaxy A36",
    "Samsung Galaxy A37",
    "Samsung Galaxy A56",
    "Samsung Galaxy A57",
    # Galaxy A — 2026
    "Samsung Galaxy A57 5G",
    "Samsung Galaxy A37 5G",
    "Samsung Galaxy A27 5G",
    "Samsung Galaxy A07 5G",
    # Galaxy Z — 2025
    "Samsung Galaxy Z Flip7 FE",
    "Samsung Galaxy Z TriFold",
    "Samsung Galaxy Z Fold7",
    "Samsung Galaxy Z Flip7",
)

# Longest / most specific patterns first. Each maps to a canonical whitelist label.
_WHITELIST_RULES: tuple[tuple[re.Pattern[str], str], ...] = tuple(
    (re.compile(pattern, re.IGNORECASE), label)
    for pattern, label in [
        (r"(?:samsung\s+)?galaxy\s+s25\s+ultra\b", "Samsung Galaxy S25 Ultra"),
        (r"(?:samsung\s+)?galaxy\s+s25\s+edge\b", "Samsung Galaxy S25 Edge"),
        (r"(?:samsung\s+)?galaxy\s+s25\s+fe\b", "Samsung Galaxy S25 FE"),
        (r"(?:samsung\s+)?galaxy\s+s25\s*\+", "Samsung Galaxy S25+"),
        (r"(?:samsung\s+)?galaxy\s+s25\b(?!\s*\+|\s*ultra|\s*edge|\s*fe\b)", "Samsung Galaxy S25"),
        (r"(?:samsung\s+)?galaxy\s+s26\s+ultra\b", "Samsung Galaxy S26 Ultra"),
        (r"(?:samsung\s+)?galaxy\s+s26\s*\+", "Samsung Galaxy S26+"),
        (r"(?:samsung\s+)?galaxy\s+s26\b(?!\s*\+|\s*ultra\b)", "Samsung Galaxy S26"),
        (r"(?:samsung\s+)?galaxy\s+a56\s+5g\b", "Samsung Galaxy A56 5G"),
        (r"(?:samsung\s+)?galaxy\s+a36\s+5g\b", "Samsung Galaxy A36 5G"),
        (r"(?:samsung\s+)?galaxy\s+a26\s+5g\b", "Samsung Galaxy A26 5G"),
        (r"(?:samsung\s+)?galaxy\s+a17\s+5g\b", "Samsung Galaxy A17 5G"),
        (r"(?:samsung\s+)?galaxy\s+a16\s+5g\b", "Samsung Galaxy A16 5G"),
        (r"(?:samsung\s+)?galaxy\s+a06\s+5g\b", "Samsung Galaxy A06 5G"),
        (r"(?:samsung\s+)?galaxy\s+a57\s+5g\b", "Samsung Galaxy A57 5G"),
        (r"(?:samsung\s+)?galaxy\s+a37\s+5g\b", "Samsung Galaxy A37 5G"),
        (r"(?:samsung\s+)?galaxy\s+a27\s+5g\b", "Samsung Galaxy A27 5G"),
        (r"(?:samsung\s+)?galaxy\s+a07\s+5g\b", "Samsung Galaxy A07 5G"),
        (r"(?:samsung\s+)?galaxy\s+a56\b(?!\s*5g\b)", "Samsung Galaxy A56"),
        (r"(?:samsung\s+)?galaxy\s+a36\b(?!\s*5g\b)", "Samsung Galaxy A36"),
        (r"(?:samsung\s+)?galaxy\s+a26\b(?!\s*5g\b)", "Samsung Galaxy A26"),
        (r"(?:samsung\s+)?galaxy\s+a17\b(?!\s*5g\b)", "Samsung Galaxy A17"),
        (r"(?:samsung\s+)?galaxy\s+a16\b(?!\s*5g\b)", "Samsung Galaxy A16"),
        (r"(?:samsung\s+)?galaxy\s+a06\b(?!\s*5g\b)", "Samsung Galaxy A06"),
        (r"(?:samsung\s+)?galaxy\s+a57\b(?!\s*5g\b)", "Samsung Galaxy A57"),
        (r"(?:samsung\s+)?galaxy\s+a37\b(?!\s*5g\b)", "Samsung Galaxy A37"),
        (r"(?:samsung\s+)?galaxy\s+a27\b(?!\s*5g\b)", "Samsung Galaxy A27"),
        (r"(?:samsung\s+)?galaxy\s+a07\b(?!\s*5g\b)", "Samsung Galaxy A07"),
        (r"(?:samsung\s+)?galaxy\s+z\s+flip\s*7\s+fe\b", "Samsung Galaxy Z Flip7 FE"),
        (r"(?:samsung\s+)?galaxy\s+z\s+trifold\b", "Samsung Galaxy Z TriFold"),
        (r"(?:samsung\s+)?galaxy\s+z\s+fold\s*7\b", "Samsung Galaxy Z Fold7"),
        (r"(?:samsung\s+)?galaxy\s+z\s+flip\s*7\b(?!\s*fe\b)", "Samsung Galaxy Z Flip7"),
    ]
)

HARD_REJECT_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"(?:samsung\s+)?galaxy\s+s24\s*\+?\b",
        r"(?:samsung\s+)?galaxy\s+s24\s+ultra\b",
        r"(?:samsung\s+)?galaxy\s+s24\s+fe\b",
        r"(?:samsung\s+)?galaxy\s+s23\b",
        r"(?:samsung\s+)?galaxy\s+s22\b",
        r"(?:samsung\s+)?galaxy\s+a55\b",
        r"(?:samsung\s+)?galaxy\s+a35\b",
        r"(?:samsung\s+)?galaxy\s+a25\b",
        r"(?:samsung\s+)?galaxy\s+a16\s+5g\b",
        r"(?:samsung\s+)?galaxy\s+a15\b",
        r"(?:samsung\s+)?galaxy\s+z\s+fold\s*6\b",
        r"(?:samsung\s+)?galaxy\s+z\s+flip\s*6\b",
        r"(?:samsung\s+)?galaxy\s+z\s+fold\s*5\b",
        r"(?:samsung\s+)?galaxy\s+z\s+flip\s*5\b",
        r"(?:samsung\s+)?galaxy\s+tab\b",
        r"(?:samsung\s+)?galaxy\s+watch\b",
        r"(?:samsung\s+)?galaxy\s+buds\b",
    ]
)

ACCESSORY_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\bcase\s+for\b",
        r"\bcover\s+for\b",
        r"\bfor\s+(?:samsung\s+)?galaxy\b",
        r"\bscreen\s+protector\b",
        r"\btempered\s+glass\b",
        r"\bprotector\s+glass\b",
        r"\blens\s+protector\b",
        r"\bcharger\b",
        r"\bcable\b",
        r"\badapter\b",
        r"\bbumper\b",
        r"\bfolio\b",
        r"\bpouch\b",
        r"\bstrap\b",
        r"\bband\b",
        r"\bwallet\b",
        r"\bback\s+cover\b",
        r"\bphone\s+case\b",
        r"\bsmart\s+cover\b",
        r"\bbook\s+cover\b",
    ]
)

SAMSUNG_KEYWORDS: tuple[str, ...] = (
    "samsung",
    "galaxy",
)

SAMSUNG_PHONE_MIN_PRICE_AMD = 30_000


class WhitelistMatch(NamedTuple):
    model: str | None
    reason: str | None


def normalize_title(value: str | None) -> str:
    value = (value or "").lower()
    value = value.replace("‑", "-").replace("–", "-").replace("—", "-")
    value = value.replace("_", " ").replace("|", " ")
    value = re.sub(r"[\(\)\[\],/]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def haystack(name: str, model: str = "") -> str:
    return normalize_title(f"{name} {model}")


def is_samsung_product_name(name: str) -> bool:
    text = normalize_title(name)
    return any(keyword in text for keyword in SAMSUNG_KEYWORDS)


def is_hard_rejected(name: str, model: str = "") -> bool:
    text = haystack(name, model)
    return any(pattern.search(text) for pattern in HARD_REJECT_PATTERNS)


def is_accessory_product(name: str, model: str = "") -> bool:
    text = haystack(name, model)
    return any(pattern.search(text) for pattern in ACCESSORY_PATTERNS)


def match_whitelist_model(name: str, model: str = "") -> WhitelistMatch:
    text = haystack(name, model)

    if not is_samsung_product_name(name):
        return WhitelistMatch(None, "not_samsung")

    if is_hard_rejected(name, model):
        return WhitelistMatch(None, "hard_reject")

    if is_accessory_product(name, model):
        return WhitelistMatch(None, "accessory")

    for pattern, label in _WHITELIST_RULES:
        if pattern.search(text):
            return WhitelistMatch(label, None)

    return WhitelistMatch(None, "not_in_whitelist")


def matches_whitelist_variant(
    *,
    name: str,
    model: str = "",
    price: int | None,
    image_url: str | None,
) -> WhitelistMatch:
    match = match_whitelist_model(name, model)
    if match.model is None:
        return match

    if not isinstance(price, int) or price <= 0:
        return WhitelistMatch(None, "missing_or_invalid_price")

    if not image_url:
        return WhitelistMatch(None, "missing_image")

    return match


def same_parent_model(left: str, right: str) -> bool:
    return normalize_title(left) == normalize_title(right)
