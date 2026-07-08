import argparse
import csv
import json
import re
import subprocess
import time
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://www.mobilecentre.am"
SCRIPT_ROOT = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_ROOT.parents[3]
SHARED_ROOT = SCRIPT_ROOT.parents[1] / "shared"
DATA_APPLE = REPO_ROOT / "data" / "product-import" / "apple"
DESCRIPTION_HTML_MODULE = SHARED_ROOT / "mobilecentre-description-html.cjs"

OUTPUT_FLAT = str(DATA_APPLE / "mobilecentre_apple_flat_variants.json")
OUTPUT_VARIABLE = str(DATA_APPLE / "mobilecentre_apple_variable_products.json")
OUTPUT_MISSING_TARGETS = str(DATA_APPLE / "mobilecentre_missing_targets.json")
OUTPUT_DEBUG = str(DATA_APPLE / "mobilecentre_scrape_debug.json")

REQUEST_SLEEP_SEARCH = 0.15
REQUEST_SLEEP_PRODUCT = 0.15
MAX_VARIANTS_PER_SEED = 120

# If targets file is provided, accessories that match targets are allowed.
# If no targets file is provided and this is False, generic accessories are skipped.
INCLUDE_ACCESSORIES_WITHOUT_TARGETS = False

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "hy-AM,hy;q=0.9,en;q=0.8,ru;q=0.7",
}

SEARCH_QUERIES = [
    # broad queries, usually safer than very specific ones on MobileCentre
    "Apple",
    "iPhone",
    "iPad",
    "MacBook",
    "MacBook Air",
    "MacBook Pro",
    "Mac mini",
    "Mac Studio",
    "iMac",
    "Apple Watch",
    "Apple Watch Series",
    "Apple Watch SE",
    "Apple Watch Ultra",
    "AirPods",
    "AirPods Pro",
    "AirPods Max",
    "HomePod",
    "Apple TV",
    "Vision Pro",
    "Apple Vision",
    "AirTag",
    "Apple MagSafe Charger",
    "MagSafe Charger Apple",
    "Magic Keyboard Apple",
    "Magic Mouse Apple",
    "Magic Trackpad Apple",
    "Apple Pencil",
    "Studio Display",
]

APPLE_KEYWORDS = [
    "apple",
    "iphone",
    "ipad",
    "macbook",
    "mac mini",
    "mac studio",
    "imac",
    "airpods",
    "homepod",
    "airtag",
    "apple watch",
    "watch ultra",
    "watch series",
    "vision pro",
    "apple tv",
    "studio display",
    "magic keyboard",
    "magic mouse",
    "magic trackpad",
    "apple pencil",
]

ACCESSORY_KEYWORDS = [
    "case",
    "cover",
    "strap",
    "loop",
    "band",
    "adapter",
    "cable",
    "charger",
    "wallet",
    "keyboard",
    "trackpad",
    "mouse",
    "pencil",
    "earpods",
    "reader",
    "leather",
    "silicone",
    "magsafe battery",
    "bumper",
    "protector",
    "lens",
    "tempered",
    "glass for iphone",
    "glass for ipad",
    "screen protector",
    "levelo",
    "shield",
]

SKIP_DESCRIPTION_UI_LINES = {
    "Առկա է խանութներում",
    "Առկա է",
    "Առկա չէ",
    "Սահմանափակ է",
    "Գնել",
    "Գնել ապառիկ",
    "Ապառիկ գին",
    "Փակել",
    "Նախնտրելիներ",
    "Համեմատություն",
}

SPEC_SECTION_HEADINGS = {
    "Ընդհանուր բնութագրեր",
    "Էկրան",
    "Տեսախցիկներ",
    "Հիշողություն և Պրոցեսոր",
    "Պրոցեսոր",
    "Հիշողություն",
    "Ցանց",
    "Սնուցում",
    "Ձայն",
    "Միացություններ",
    "Այլ",
}

OTHER_KNOWN_SECTION_HEADERS = {
    "Կապ",
    "Պրոցեսորներ, Միջուկներ, Թելեր",
    "Հիմնական",
}

SPECS_STOP_MARKERS = [
    "Նշված արժեքը չի գործում",
    "Ապառիկը ձևակերպելիս",
    "Կանխավճարը",
    "Յունիբանկ",
    "ԱԿԲԱ",
    "Ինեկոբանկ",
    "ՎՏԲ",
    "Tweet",
    "Share",
    "Տեսականի",
    "Բոնուսային միավորներ",
    "Մեր մասին",
    "Խանութներ",
    "Պայմաններ",
    "Կապ",
    "Աշխատատեղեր",
    "©",
]

SPECS_CONTAINER_SELECTORS = [
    ".detailes-block",
    ".details-block",
    "[class*='detail']",
    "[class*='spec']",
    "[class*='character']",
    "[class*='description']",
]

COLOR_ALIASES = {
    "space grey": "Space Gray",
    "space gray": "Space Gray",
    "space black": "Space Black",
    "jet black": "Jet Black",
    "black titanium": "Black Titanium",
    "natural titanium": "Natural Titanium",
    "rose gold": "Rose Gold",
    "product red": "Product Red",
    "(product)red": "Product Red",
    "midnight": "Midnight",
    "starlight": "Starlight",
    "silver": "Silver",
    "black": "Black",
    "white": "White",
    "blue": "Blue",
    "sky blue": "Sky Blue",
    "mist blue": "Mist Blue",
    "deep blue": "Deep Blue",
    "cloud white": "Cloud White",
    "light gold": "Light Gold",
    "cosmic orange": "Cosmic Orange",
    "orange": "Orange",
    "green": "Green",
    "sage": "Sage",
    "lavender": "Lavender",
    "purple": "Purple",
    "pink": "Pink",
    "yellow": "Yellow",
    "gold": "Gold",
    "graphite": "Graphite",
    "sierra blue": "Sierra Blue",
}


@dataclass(frozen=True)
class TargetRow:
    category: str
    year: str
    model: str
    color: str
    configs_raw: str
    connectivity: str
    note: str = ""


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("\u200b", "").replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize(value: str | None) -> str:
    value = clean_text(value).lower()
    value = value.replace("‑", "-").replace("–", "-").replace("—", "-")
    value = value.replace("_", " ").replace("|", " ")
    value = re.sub(r"[\(\)\[\],/]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def title_color(value: str) -> str:
    key = normalize(value)
    if key in COLOR_ALIASES:
        return COLOR_ALIASES[key]
    return " ".join(word.capitalize() for word in clean_text(value).split())


def get_html(url: str) -> str:
    response = requests.get(url, headers=HEADERS, timeout=35)
    response.raise_for_status()
    return response.text


def normalize_product_pid(raw: str | None) -> str | None:
    """Extract numeric product id only. Stops pid=32590/ -> 32590// chains."""
    if not raw:
        return None
    match = re.search(r"(\d+)", str(raw))
    return match.group(1) if match else None


def canonical_product_url(url: str) -> str | None:
    url = urljoin(BASE_URL, url).split("#")[0]
    parsed = urlparse(url)
    query = parse_qs(parsed.query)

    pid = None
    if "pid" in query and query["pid"]:
        pid = normalize_product_pid(query["pid"][0])

    if not pid:
        match = re.search(r"/product/[^/]+/(\d+)/?", parsed.path)
        if match:
            pid = match.group(1)

    if pid:
        return f"{BASE_URL}/index.php?m=prod&pid={pid}"

    if "/product/" in parsed.path:
        return f"{BASE_URL}{parsed.path.rstrip('/')}/"

    return None


def extract_source_pid(product_url: str, page_text: str = "") -> str | None:
    parsed = urlparse(product_url)
    query = parse_qs(parsed.query)
    if "pid" in query and query["pid"]:
        pid = normalize_product_pid(query["pid"][0])
        if pid:
            return pid

    match = re.search(r"/product/[^/]+/(\d+)/?", parsed.path)
    if match:
        return match.group(1)

    match = re.search(r"\bID\s*:\s*([\d,]+)", page_text)
    if match:
        return match.group(1).split(",")[0]

    return None


def variant_dedupe_key(variant: dict[str, Any]) -> str:
    pid = normalize_product_pid(variant.get("source_pid"))
    if pid:
        return f"pid:{pid}"

    visible_id = variant.get("visible_id")
    if visible_id:
        first_id = str(visible_id).split(",")[0].strip()
        if first_id:
            return f"visible:{first_id}"

    canonical = canonical_product_url(str(variant.get("product_url", "")))
    return f"url:{canonical or variant.get('product_url', '')}"


APPLE_PRODUCT_SLUG_HINTS = (
    "apple-",
    "iphone",
    "ipad",
    "macbook",
    "mac-mini",
    "mac-studio",
    "imac",
    "airpods",
    "airtag",
    "homepod",
    "apple-watch",
    "vision-pro",
    "studio-display",
    "apple-tv",
    "apple-pencil",
    "magic-keyboard",
    "magic-mouse",
    "magic-trackpad",
)


def is_likely_apple_product_href(url: str) -> bool:
    """
    Filter search-result links before enqueueing seeds.
    MagSafe/Watch/iPhone queries return many third-party accessories.
    """
    parsed = urlparse(urljoin(BASE_URL, url))
    path = parsed.path.lower()

    if "/product/" not in path:
        return False

    slug = path.split("/product/", 1)[-1].lower()
    return any(hint in slug for hint in APPLE_PRODUCT_SLUG_HINTS)


def strip_related_html(html: str) -> str:
    # This is the most important gallery fix.
    # Product pages include related products below this heading. If we parse all images,
    # every variant gets other products' images too. Wonderful, naturally.
    split_markers = [
        "Նմանատիպ ապրանքներ",
        "Похожие товары",
        "Similar products",
        "Related products",
    ]
    cut_index = len(html)
    for marker in split_markers:
        idx = html.find(marker)
        if idx != -1:
            cut_index = min(cut_index, idx)
    return html[:cut_index]


def extract_variant_links_from_html(html: str, current_url: str) -> list[str]:
    """
    Variant links only from the product header area.
    Excludes related products and spec blocks to avoid crawling the whole store.
    """
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
        links.add(link)

    return sorted(links)


def extract_product_links_from_html(
    html: str,
    current_url: str = BASE_URL,
    *,
    apple_only: bool = False,
) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    links: set[str] = set()

    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if not href:
            continue

        if "/product/" not in href and "m=prod" not in href:
            continue

        full_href = urljoin(current_url, href)
        if apple_only and not is_likely_apple_product_href(full_href):
            continue

        canonical = canonical_product_url(full_href)
        if canonical:
            links.add(canonical)

    return sorted(links)


def find_next_page_urls(html: str, current_url: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    urls: set[str] = set()

    for a in soup.select("a[href]"):
        href = a.get("href", "")
        text = clean_text(a.get_text(" ")).lower()
        if not href:
            continue

        href_norm = href.lower()
        pagination_hint = (
            "page=" in href_norm
            or "p=" in href_norm
            or text in {"next", "հաջորդ", ">", "»"}
        )

        if pagination_hint and "search" in href_norm:
            urls.add(urljoin(current_url, href))

    return sorted(urls)


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

        for link in extract_product_links_from_html(html, url, apple_only=True):
            product_links.add(link)

        for next_url in find_next_page_urls(html, url):
            if next_url not in visited and next_url not in urls_to_visit:
                urls_to_visit.append(next_url)

        time.sleep(REQUEST_SLEEP_SEARCH)

    return sorted(product_links)


def extract_price(text: str) -> int | None:
    match = re.search(r"Գին՝\s*([\d,\s]+)\s*դր", text)
    if not match:
        match = re.search(r"([\d,\s]{4,})\s*դր", text)
    if not match:
        return None

    value = re.sub(r"[^\d]", "", match.group(1))
    return int(value) if value else None


def extract_name(soup: BeautifulSoup) -> str:
    name = ""
    og_title = soup.select_one('meta[property="og:title"]')
    if og_title and og_title.get("content"):
        name = clean_text(og_title["content"])

    if not name:
        h1 = soup.select_one("h1")
        if h1:
            name = clean_text(h1.get_text(" "))

    if not name:
        title = soup.select_one("title")
        if title:
            name = clean_text(title.get_text(" "))

    for prefix in ["Mobile Centre. -", "Mobile Centre -", "Mobile Centre.", "Mobile Centre"]:
        if name.startswith(prefix):
            name = name[len(prefix):].strip()

    name = re.sub(r"^AApple\b", "Apple", name)
    name = re.sub(r"^A\.\s*", "", name)
    return name.strip(" -|.")


def is_valid_product_image(url: str) -> bool:
    url_norm = url.lower()
    if "/img/prodpic/" not in url_norm:
        return False
    if "/small/" in url_norm:
        return False
    if "nowimg" in url_norm:
        return False
    if url_norm.endswith("/img/prodpic/"):
        return False
    return True


def extract_all_image_urls(product_soup: BeautifulSoup) -> list[str]:
    images: list[str] = []
    seen: set[str] = set()

    og_image = product_soup.select_one('meta[property="og:image"]')
    if og_image and og_image.get("content"):
        img_url = urljoin(BASE_URL, og_image["content"])
        if is_valid_product_image(img_url):
            images.append(img_url)
            seen.add(img_url)

    for img in product_soup.select("img"):
        src = (
            img.get("src")
            or img.get("data-src")
            or img.get("data-original")
            or img.get("data-lazy")
            or img.get("data-image")
        )
        if not src:
            continue

        full_src = urljoin(BASE_URL, src)
        if not is_valid_product_image(full_src):
            continue

        if full_src not in seen:
            images.append(full_src)
            seen.add(full_src)

    return images


def find_specs_container(soup: BeautifulSoup):
    for selector in SPECS_CONTAINER_SELECTORS:
        for node in soup.select(selector):
            text = clean_text(node.get_text(" "))
            if "Ընդհանուր բնութագրեր" in text:
                return node
    return None


def extract_mobilecentre_specs_lines(soup: BeautifulSoup) -> list[str]:
    container = find_specs_container(soup)
    text = container.get_text("\n") if container else soup.get_text("\n")

    lines = [clean_text(line) for line in text.splitlines()]
    lines = [line for line in lines if line]

    result: list[str] = []
    capture = False

    for line in lines:
        if "Ընդհանուր բնութագրեր" in line:
            capture = True
            result.append("Ընդհանուր բնութագրեր")
            continue

        if not capture:
            continue

        if "Նմանատիպ ապրանքներ" in line:
            break

        if any(stop in line for stop in SPECS_STOP_MARKERS):
            break

        if line in SKIP_DESCRIPTION_UI_LINES:
            continue

        result.append(line)

    return result


def filter_allowed_spec_sections(lines: list[str]) -> list[str]:
    if not lines:
        return []

    filtered: list[str] = []
    active = False

    for line in lines:
        if line in SPEC_SECTION_HEADINGS:
            active = True
            filtered.append(line)
            continue

        if line in OTHER_KNOWN_SECTION_HEADERS:
            active = False
            continue

        if active:
            filtered.append(line)

    return filtered


def build_description_html(raw: str) -> str | None:
    if not raw or not raw.strip():
        return None
    if not DESCRIPTION_HTML_MODULE.exists():
        return None

    module_path = str(DESCRIPTION_HTML_MODULE).replace("\\", "/")
    code = (
        "const m=require(process.argv[1]);"
        "const r=m.buildDescriptionHtml(process.argv[2]);"
        "process.stdout.write(r || '');"
    )
    proc = subprocess.run(
        ["node", "-e", code, module_path, raw],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if proc.returncode != 0:
        return None

    html = proc.stdout.strip()
    return html or None


def extract_product_description_fields(soup: BeautifulSoup) -> tuple[str, str | None]:
    lines = filter_allowed_spec_sections(extract_mobilecentre_specs_lines(soup))
    description_raw = " | ".join(lines) if lines else ""
    description_html = build_description_html(description_raw) if description_raw else None
    return description_raw, description_html


def is_apple_product_name(name: str) -> bool:
    name_norm = normalize(name)
    return any(keyword in name_norm for keyword in APPLE_KEYWORDS)


def is_apple_watch_device(name: str) -> bool:
    name_norm = normalize(name)
    if "apple watch" not in name_norm:
        return False

    has_model = any(keyword in name_norm for keyword in ["series", "ultra", "se", "gps", "cellular"])
    has_size = bool(re.search(r"\b(38|40|41|42|44|45|46|49)\s*mm\b", name_norm))
    return has_model and has_size


def is_accessory_product(name: str) -> bool:
    name_norm = normalize(name)

    # Apple Watch device names contain Band/Loop, but they are still watches.
    # Without this exception, all watches disappear. Lovely little trap.
    if is_apple_watch_device(name):
        return False

    # Magic Keyboard for iPad is a target accessory, but still an accessory.
    return any(keyword in name_norm for keyword in ACCESSORY_KEYWORDS)


def extract_color_from_name(name: str) -> str | None:
    clean = clean_text(name)
    name_norm = normalize(clean)

    # Apple Watch: Rose Gold Aluminium Case, Black Titanium Case, etc.
    watch_case = re.search(
        r"\b([A-Za-z]+(?:\s+[A-Za-z]+){0,3})\s+(?:Aluminium|Aluminum|Titanium|Stainless Steel)\s+Case\b",
        clean,
        re.IGNORECASE,
    )
    if watch_case:
        return title_color(watch_case.group(1))

    # Last parentheses often contain product color: iPhone 17 Pro (Silver)
    parens = re.findall(r"\(([^()]*)\)", clean)
    for value in reversed(parens):
        value_clean = clean_text(value)
        value_norm = normalize(value_clean)
        # skip model codes like MXN73, MEHQ4, MTJV3
        if re.fullmatch(r"[A-Z0-9/]{4,12}", value_clean.replace("/", ""), re.IGNORECASE):
            continue
        if value_norm in COLOR_ALIASES or len(value_clean.split()) <= 4:
            return title_color(value_clean)

    # Trailing color after model code: (MW123) Midnight
    trailing = re.search(r"\)[\s_-]+([A-Za-z]+(?:\s+[A-Za-z]+){0,3})$", clean)
    if trailing:
        candidate = trailing.group(1)
        if normalize(candidate) in COLOR_ALIASES:
            return title_color(candidate)

    # Known colors anywhere, prefer longest match.
    for color_key in sorted(COLOR_ALIASES.keys(), key=len, reverse=True):
        if re.search(rf"\b{re.escape(color_key)}\b", name_norm):
            return COLOR_ALIASES[color_key]

    return None


def extract_storage(name: str) -> str | None:
    match = re.search(r"\b(64GB|128GB|256GB|512GB|1TB|2TB|4TB|8TB)\b", name, re.IGNORECASE)
    if match:
        return match.group(1).upper().replace("GB", "GB").replace("TB", "TB")
    return None


def extract_memory(name: str) -> str | None:
    # Avoid treating storage as RAM by requiring Memory/RAM near the number.
    match = re.search(r"\b(8GB|16GB|18GB|24GB|32GB|36GB|48GB|64GB|96GB|128GB)\s*(?:Memory|RAM)\b", name, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    match = re.search(r"\b(8|16|18|24|32|36|48|64|96|128)\s*GB\s*(?:Memory|RAM)\b", name, re.IGNORECASE)
    if match:
        return f"{match.group(1)}GB"
    return None


def extract_connectivity(name: str) -> str | None:
    name_norm = normalize(name)
    if "gps cellular" in name_norm or "gps + cellular" in name_norm or "gps+cellular" in name_norm:
        return "GPS + Cellular"
    if re.search(r"\bgps\b", name_norm):
        return "GPS"
    if "wi-fi + cellular" in name_norm or "wifi + cellular" in name_norm or "wi fi + cellular" in name_norm:
        return "Wi‑Fi + Cellular"
    if "wi-fi" in name_norm or "wifi" in name_norm or "wi fi" in name_norm:
        return "Wi‑Fi"
    if "dual esim" in name_norm:
        return "Dual eSIM"
    if "nano sim" in name_norm and "esim" in name_norm:
        return "Nano-SIM + eSIM"
    return None


def extract_size(name: str) -> str | None:
    match = re.search(r"\b(38|40|41|42|44|45|46|49)\s*mm\b", name, re.IGNORECASE)
    if match:
        return f"{match.group(1)}mm"

    match = re.search(r"\b(11|12\.9|13|13\.0|13\.3|13\.6|14|14\.2|15|15\.3|16|16\.2|21\.5|24|27|32)\s*(?:inch|\")\b", name, re.IGNORECASE)
    if match:
        value = match.group(1).rstrip(".0") if match.group(1).endswith(".0") else match.group(1)
        return f"{value}-inch"

    return None


def extract_watch_band_options(name: str) -> dict[str, str]:
    options: dict[str, str] = {}
    if "apple watch" not in normalize(name):
        return options

    band_match = re.search(
        r"\bwith\s+(.+?)\s+(Sport Band|Trail Loop|Alpine Loop|Milanese Loop|Solo Loop|Ocean Band)\b",
        name,
        re.IGNORECASE,
    )
    if band_match:
        options["band_color"] = clean_text(band_match.group(1))
        options["band_type"] = clean_text(band_match.group(2))

    band_size_match = re.search(r"\b(S/M|M/L|Small|Medium|Large)\b", name, re.IGNORECASE)
    if band_size_match:
        options["band_size"] = band_size_match.group(1).upper()

    material_match = re.search(r"\b(Aluminium|Aluminum|Titanium|Stainless Steel)\s+Case\b", name, re.IGNORECASE)
    if material_match:
        material = material_match.group(1)
        if material.lower() == "aluminum":
            material = "Aluminium"
        options["case_material"] = material

    return options


def extract_model(name: str) -> str:
    clean = clean_text(name)

    patterns = [
        r"\bApple\s+Watch\s+Ultra\s+\d+\b",
        r"\bApple\s+Watch\s+Series\s+\d+\b",
        r"\bApple\s+Watch\s+SE\s*\d*\b",
        r"\biPhone\s+\d+\s+Pro\s+Max\b",
        r"\biPhone\s+\d+\s+Pro\b",
        r"\biPhone\s+\d+e\b",
        r"\biPhone\s+\d+\s+Air\b",
        r"\biPhone\s+Air\b",
        r"\biPhone\s+\d+\b",
        r"\biPad\s+Pro\s+(?:11|13)(?:-inch|\s*inch)?\s*M\d\b",
        r"\biPad\s+Air\s+(?:11|13)(?:-inch|\s*inch)?\s*M\d\b",
        r"\biPad\s+mini\b(?:\s+OLED)?",
        r"\biPad\s+\d+(?:th)?\s+Gen\b",
        r"\biPad\s+A\d+\b",
        r"\bMacBook\s+Air\s+(?:13(?:\.6)?|15(?:\.3)?|13\.0)(?:-inch|\s*inch)?(?:.*?\bM\d\b)?",
        r"\bMacBook\s+Pro\s+(?:13(?:\.0)?|14(?:\.2)?|16(?:\.2)?)(?:-inch|\s*inch)?(?:.*?\bM\d(?:\s+Pro|\s+Max)?\b)?",
        r"\bMacBook\s+Neo\b",
        r"\bMac\s+mini\s+M\d\b",
        r"\bMac\s+Studio\s+(?:M\d\s+Max|M\d\s+Ultra|\d{4})\b",
        r"\biMac\s+(?:21\.5|24|27)(?:-inch|\s*inch)?(?:.*?\bM\d\b)?",
        r"\bAirPods\s+Pro\s+\d\b",
        r"\bAirPods\s+Max\s*\d*\b",
        r"\bAirPods\s+\d(?:st|nd|rd|th)?\b",
        r"\bApple\s+AirPods\s+\d(?:st|nd|rd|th)?\b",
        r"\bApple\s+TV\b(?:\s+4K)?",
        r"\bHomePod\s+mini\s*\d*\b",
        r"\bHomePod\s*\d*\b",
        r"\bApple\s+Vision\s+Pro\b(?:\s+M\d)?",
        r"\bVision\s+Pro\b(?:\s+M\d)?",
        r"\bStudio\s+Display\b(?:\s+XDR)?",
        r"\bMagic\s+Keyboard\b.*?iPad\s+Air",
        r"\bMagSafe\s+Charger\b",
        r"\bMagSafe\s+Battery\b",
        r"\bAirTag\s*\d*\b",
        r"\bApple\s+AirTag\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, clean, re.IGNORECASE)
        if match:
            model = clean_text(match.group(0))
            model = re.sub(r"\s+with\s+.*$", "", model, flags=re.IGNORECASE)
            return model

    # fallback: remove known options from name
    model = re.sub(r"\b(64GB|128GB|256GB|512GB|1TB|2TB|4TB|8TB)\b", "", clean, flags=re.IGNORECASE)
    model = re.sub(r"\([^)]*\)$", "", model)
    return clean_text(model)


def extract_variant_options(name: str) -> dict[str, str]:
    options: dict[str, str] = {}

    color = extract_color_from_name(name)
    if color:
        options["color"] = color

    storage = extract_storage(name)
    if storage:
        options["storage"] = storage

    memory = extract_memory(name)
    if memory:
        options["memory"] = memory

    connectivity = extract_connectivity(name)
    if connectivity:
        options["connectivity"] = connectivity

    size = extract_size(name)
    if size:
        options["size"] = size

    options.update(extract_watch_band_options(name))

    return options


def detect_category(name: str, model: str, options: dict[str, str]) -> str:
    name_norm = normalize(f"{name} {model}")
    if "iphone" in name_norm:
        return "iPhone"
    if "ipad" in name_norm and "keyboard" not in name_norm:
        return "iPad"
    if "apple watch" in name_norm:
        return "Apple Watch"
    if "airpods" in name_norm:
        return "AirPods"
    if "macbook" in name_norm:
        return "MacBook"
    if "imac" in name_norm:
        return "iMac"
    if "mac mini" in name_norm:
        return "Mac mini"
    if "mac studio" in name_norm:
        return "Mac Studio"
    if "vision pro" in name_norm:
        return "Vision"
    if "apple tv" in name_norm:
        return "Home & TV"
    if "homepod" in name_norm:
        return "Home & TV"
    if "studio display" in name_norm:
        return "Mac / Display"
    if "airtag" in name_norm:
        return "Accessories"
    if is_accessory_product(name):
        return "Accessories"
    return "Other"


def product_matches_targets(name: str, model: str, targets: list[TargetRow]) -> bool:
    if not targets:
        return True

    haystack = normalize(f"{name} {model}")
    for target in targets:
        target_model = normalize(target.model)
        if target_model and all(token in haystack for token in target_model.split() if token not in {"/", "-"}):
            return True
    return False


def parse_target_file(path: Path) -> list[TargetRow]:
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8-sig")
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return []

    sample = lines[0]
    delimiter = "\t" if "\t" in sample else ","
    reader = csv.reader(lines, delimiter=delimiter)
    rows = list(reader)

    # Headerless target file from ChatGPT starts directly with iPhone / Mac / iPad.
    if rows and rows[0] and normalize(rows[0][0]) in {"category", "type"}:
        rows = rows[1:]

    targets: list[TargetRow] = []
    for row in rows:
        row = row + [""] * 13
        targets.append(
            TargetRow(
                category=clean_text(row[0]),
                year=clean_text(row[1]),
                model=clean_text(row[2]),
                color=clean_text(row[3]),
                configs_raw=clean_text(row[4]),
                connectivity=clean_text(row[6]),
                note=clean_text(row[12]),
            )
        )

    return targets


def build_search_queries(targets: list[TargetRow]) -> list[str]:
    queries = list(dict.fromkeys(SEARCH_QUERIES))
    for target in targets:
        model = clean_text(target.model)
        if not model:
            continue
        queries.append(model)
        # safer broad form for broken exact searches
        base = re.sub(r"\b(128GB|256GB|512GB|1TB|2TB|M\d|M\d\s+Pro|M\d\s+Max)\b", "", model, flags=re.IGNORECASE)
        base = clean_text(base)
        if base and base != model:
            queries.append(base)

    # Preserve order, dedupe.
    return list(dict.fromkeys(queries))


def parse_product_page(product_url: str, targets: list[TargetRow]) -> tuple[dict[str, Any] | None, str, list[str]]:
    html = get_html(product_url)
    product_html = strip_related_html(html)
    soup = BeautifulSoup(product_html, "lxml")
    page_text = clean_text(soup.get_text(" "))

    name = extract_name(soup)
    if not name:
        return None, html, []

    if not is_apple_product_name(name):
        return None, html, []

    model = extract_model(name)
    options = extract_variant_options(name)
    category = detect_category(name, model, options)
    is_accessory = is_accessory_product(name)

    if targets:
        if not product_matches_targets(name, model, targets):
            return None, html, []
    elif is_accessory and not INCLUDE_ACCESSORIES_WITHOUT_TARGETS:
        return None, html, []

    gallery = extract_all_image_urls(soup)
    image_url = gallery[0] if gallery else None

    visible_id = None
    visible_id_match = re.search(r"\bID\s*:\s*([\d,]+)", page_text)
    if visible_id_match:
        visible_id = visible_id_match.group(1)

    source_pid = extract_source_pid(product_url, page_text)
    canonical_url = canonical_product_url(product_url) or product_url

    description_raw, description_html = extract_product_description_fields(soup)

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
        "price": extract_price(page_text),
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
    if not seed or not candidate:
        return False

    seed_model = normalize(seed.get("model", ""))
    candidate_model = normalize(candidate.get("model", ""))
    if not seed_model or not candidate_model:
        return False

    if seed_model == candidate_model:
        return True

    strict_categories = {"Apple Watch", "AirPods"}
    if seed.get("category") in strict_categories or candidate.get("category") in strict_categories:
        return seed_model == candidate_model

    # iPhone/iPad/Mac grouping should not merge Pro and Pro Max or different sizes.
    seed_tokens = set(seed_model.split())
    candidate_tokens = set(candidate_model.split())
    important = {"iphone", "ipad", "macbook", "air", "pro", "max", "mini", "ultra", "series", "se", "13", "14", "15", "16", "17", "18"}
    seed_important = seed_tokens & important
    candidate_important = candidate_tokens & important
    return seed_important == candidate_important and bool(seed_important)


def scrape_product_with_variants(seed_url: str, targets: list[TargetRow], global_seen_urls: set[str]) -> list[dict[str, Any]]:
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
            variant, _html, links = parse_product_page(canonical, targets)
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


def unique_keep_order(values: list[Any]) -> list[Any]:
    result = []
    seen = set()
    for value in values:
        if value is None or value == "":
            continue
        marker = json.dumps(value, sort_keys=True, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value)
        if marker in seen:
            continue
        seen.add(marker)
        result.append(value)
    return result


def variant_sort_key(variant: dict[str, Any]) -> tuple:
    options = variant.get("options", {})
    return (
        options.get("color", ""),
        options.get("size", ""),
        options.get("connectivity", ""),
        options.get("storage", ""),
        options.get("memory", ""),
        variant.get("name", ""),
    )


def build_variable_products(flat_variants: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for variant in flat_variants:
        model_key = normalize(f"{variant.get('category', '')} {variant.get('model', '')}")
        groups[model_key].append(variant)

    variable_products: list[dict[str, Any]] = []

    for _model_key, variants in groups.items():
        variants = sorted(variants, key=variant_sort_key)
        first = variants[0]

        option_values: dict[str, list[str]] = defaultdict(list)
        gallery_by_color: dict[str, list[str]] = defaultdict(list)
        parent_gallery: list[str] = []

        min_price = None
        max_price = None

        for variant in variants:
            price = variant.get("price")
            if isinstance(price, int):
                min_price = price if min_price is None else min(min_price, price)
                max_price = price if max_price is None else max(max_price, price)

            options = variant.get("options", {})
            for key, value in options.items():
                option_values[key].append(value)

            color = options.get("color") or "Default"
            gallery = variant.get("gallery", []) or []
            gallery_by_color[color].extend(gallery)
            parent_gallery.extend(gallery)

        clean_option_values = {
            key: sorted(unique_keep_order(values), key=lambda item: normalize(item))
            for key, values in option_values.items()
        }

        clean_gallery_by_color = {
            color: unique_keep_order(images)
            for color, images in gallery_by_color.items()
        }

        parent_gallery = unique_keep_order(parent_gallery)

        parent_description_html = next(
            (v.get("descriptionHtml") for v in variants if v.get("descriptionHtml")),
            None,
        )

        parent = {
            "source": "mobilecentre",
            "type": "variable",
            "model": first.get("model"),
            "category": first.get("category"),
            "name": first.get("model"),
            "currency": "AMD",
            "price_min": min_price,
            "price_max": max_price,
            "available_options": clean_option_values,
            # Parent gallery contains all colors/variant images.
            # Variant gallery below stays variant-specific. This is the whole point.
            "gallery": parent_gallery,
            "gallery_by_color": clean_gallery_by_color,
            "variants": variants,
            "variant_count": len(variants),
            "descriptionHtml": parent_description_html,
            "description": parent_description_html,
        }

        variable_products.append(parent)

    variable_products.sort(key=lambda item: (item.get("category", ""), item.get("model", "")))
    return variable_products


def build_missing_targets(targets: list[TargetRow], variable_products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not targets:
        return []

    found_models = [normalize(item.get("model", "")) for item in variable_products]
    missing: list[dict[str, Any]] = []

    for target in targets:
        target_model = normalize(target.model)
        if not target_model:
            continue

        found = any(
            all(token in found_model for token in target_model.split() if token)
            or all(token in target_model for token in found_model.split() if token)
            for found_model in found_models
        )

        if not found:
            missing.append({
                "category": target.category,
                "year": target.year,
                "model": target.model,
                "color": target.color,
                "configs_raw": target.configs_raw,
                "connectivity": target.connectivity,
                "note": target.note,
            })

    return missing


def main() -> None:
    global INCLUDE_ACCESSORIES_WITHOUT_TARGETS, REQUEST_SLEEP_PRODUCT, REQUEST_SLEEP_SEARCH

    parser = argparse.ArgumentParser(description="Scrape MobileCentre Apple products with variant-specific galleries.")
    parser.add_argument("--url", help="Scrape one MobileCentre product URL and its variants.")
    parser.add_argument("--targets", help="Optional TSV/CSV file with required target models, colors and variants.")
    parser.add_argument("--include-accessories", action="store_true", help="Include generic Apple accessories when no target file is used.")
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
    args = parser.parse_args()

    if args.include_accessories:
        INCLUDE_ACCESSORIES_WITHOUT_TARGETS = True

    if args.fast:
        REQUEST_SLEEP_PRODUCT = 0.05
        REQUEST_SLEEP_SEARCH = 0.05
    else:
        REQUEST_SLEEP_PRODUCT = max(0.0, args.sleep_product)
        REQUEST_SLEEP_SEARCH = max(0.0, args.sleep_search)

    targets = parse_target_file(Path(args.targets)) if args.targets else []
    print(f"Loaded targets: {len(targets)}")

    candidate_links: set[str] = set()

    if args.url:
        canonical = canonical_product_url(args.url)
        if not canonical:
            raise ValueError(f"Not a product URL: {args.url}")
        candidate_links.add(canonical)
    else:
        queries = build_search_queries(targets)
        for index, query in enumerate(queries, start=1):
            print(f"[SEARCH {index}/{len(queries)}] {query}")
            links = scrape_search_results(query)
            print(f"  Found product links: {len(links)}")
            candidate_links.update(links)
            time.sleep(REQUEST_SLEEP_SEARCH)

    print("")
    print(f"Total unique candidate links: {len(candidate_links)}")
    print("")

    flat_variants: list[dict[str, Any]] = []
    global_seen_urls: set[str] = set()

    for index, url in enumerate(sorted(candidate_links), start=1):
        if url in global_seen_urls:
            continue

        print(f"[SEED {index}/{len(candidate_links)}] {url}")
        variants = scrape_product_with_variants(url, targets, global_seen_urls)
        print(f"  Variants collected: {len(variants)}")
        flat_variants.extend(variants)

    # Final dedupe across all seed groups.
    deduped: list[dict[str, Any]] = []
    seen_variant_keys: set[str] = set()
    for variant in flat_variants:
        key = variant_dedupe_key(variant)
        if key in seen_variant_keys:
            continue
        seen_variant_keys.add(key)
        deduped.append(variant)

    deduped.sort(key=lambda item: (item.get("category", ""), item.get("model", ""), variant_sort_key(item)))
    variable_products = build_variable_products(deduped)
    missing_targets = build_missing_targets(targets, variable_products)

    Path(OUTPUT_FLAT).write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")
    Path(OUTPUT_VARIABLE).write_text(json.dumps(variable_products, ensure_ascii=False, indent=2), encoding="utf-8")

    if targets:
        Path(OUTPUT_MISSING_TARGETS).write_text(json.dumps(missing_targets, ensure_ascii=False, indent=2), encoding="utf-8")

    debug = {
        "candidate_links": len(candidate_links),
        "flat_variants": len(deduped),
        "variable_products": len(variable_products),
        "missing_targets": len(missing_targets),
        "outputs": [OUTPUT_FLAT, OUTPUT_VARIABLE] + ([OUTPUT_MISSING_TARGETS] if targets else []),
    }
    Path(OUTPUT_DEBUG).write_text(json.dumps(debug, ensure_ascii=False, indent=2), encoding="utf-8")

    print("")
    print("Done.")
    print(f"Flat variants: {len(deduped)} -> {OUTPUT_FLAT}")
    print(f"Variable products: {len(variable_products)} -> {OUTPUT_VARIABLE}")
    if targets:
        print(f"Missing targets: {len(missing_targets)} -> {OUTPUT_MISSING_TARGETS}")
    print(f"Debug: {OUTPUT_DEBUG}")


if __name__ == "__main__":
    main()
