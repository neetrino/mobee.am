# Product import scripts

Organized layout for MobileCentre / YerevanMobile / iSpace product import tooling.

> **Note (2026-07-07):** Files were moved here for organization only.
> No import was run and no DB write was performed during this reorganization.

## Image cache location

Product import image cache files live under:

`data/product-import/cache/`

Root-level image cache dotfiles are no longer used.

Moved files:

- `.mobilecentre-image-cache.json`
- `.apple-source-import-image-cache.json`
- `.samsung-source-import-image-cache.json`
- `.samsung-yerevanmobile-import-image-cache.json`
- `.device-source-import-image-cache.json`

Do not delete these cache files unless we intentionally want to force image reprocessing/reupload.

Cache paths are centralized in `scripts/product-import/paths.cjs` (`cache.*` exports).

## Folder map

```
scripts/product-import/
├── pipelines/
│   ├── apple/          # Apple source import (MobileCentre, YerevanMobile, iSpace)
│   ├── samsung/        # Samsung source import
│   └── device/         # Dyson / PlayStation device import
├── shared/             # Shared helpers (HTML, media, whitelist, price display)
├── sources/
│   ├── mobilecentre/   # MobileCentre scrapers & whitelist filters (1.py, 2.py, …)
│   ├── yerevanmobile/  # (reserved)
│   └── ispace/         # (reserved)
├── cleanup/            # (reserved)
├── maintenance/        # Backfills, description restore, category reclassify, etc.
├── legacy/             # Destructive / old import scripts
│   ├── probes/         # One-off probe scripts
│   └── device-partial/ # Superseded partial device migration copies
└── README.md

audit/product-import/
├── apple/
├── samsung/
├── device/
├── backups/
└── general/

data/product-import/
├── apple/              # mobilecentre_apple_*.json
├── samsung/            # mobilecentre_samsung_*.json
└── cache/              # Image dedupe caches (.mobilecentre-image-cache.json, …)
```

## Entry points

| Pipeline | Dry-run | Import |
|----------|---------|--------|
| Apple | `node scripts/product-import/pipelines/apple/run-apple-source-import.cjs --dry-run` | `--import` |
| Samsung | `node scripts/product-import/pipelines/samsung/run-samsung-source-import.cjs --dry-run` | `--import` |
| Device | `node scripts/product-import/pipelines/device/run.cjs --dry-run` | `--import` |

Legacy compatibility: `node scripts/product-import/pipelines/device/run-device-source-import.cjs` delegates to `run.cjs`.

## Scrape data

MobileCentre JSON outputs live under `data/product-import/apple/` and `data/product-import/samsung/` (not repo root).

Audit reports from dry-runs go under `audit/product-import/{apple,samsung,device}/`.
