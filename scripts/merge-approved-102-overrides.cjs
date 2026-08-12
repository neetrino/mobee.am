"use strict";

/**
 * Merge approved-102-batch overrides into official-product-page-overrides.json.
 * Preserves existing entries; batch keys overwrite on collision for same brand/key.
 */

const fs = require("fs");
const path = require("path");
const {
  buildOverrideMaps,
  modelsCsvCompact,
  BATCH_ROWS,
} = require("./lib/official-images/approved-102-batch.cjs");

const OVERRIDES_PATH = path.join(
  process.cwd(),
  "scripts",
  "official-product-page-overrides.json"
);
const MODELS_PATH = path.join(
  process.cwd(),
  "tmp",
  "official-images-approved-102-models.txt"
);

function main() {
  const existing = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  const { byBrand, uniqueLogicalCount, keyCount } = buildOverrideMaps();

  let added = 0;
  let updated = 0;
  for (const [brand, map] of Object.entries(byBrand)) {
    if (!existing[brand]) existing[brand] = {};
    for (const [key, entry] of Object.entries(map)) {
      if (existing[brand][key]) updated += 1;
      else added += 1;
      existing[brand][key] = entry;
    }
  }

  fs.writeFileSync(OVERRIDES_PATH, `${JSON.stringify(existing, null, 2)}\n`);

  const models = modelsCsvCompact();
  fs.mkdirSync(path.dirname(MODELS_PATH), { recursive: true });
  fs.writeFileSync(MODELS_PATH, models.join(","));

  const byBrandLogical = {};
  for (const row of BATCH_ROWS) {
    const k = `${row.brand}|${row.marcoModel}`;
    byBrandLogical[row.brand] = byBrandLogical[row.brand] || new Set();
    byBrandLogical[row.brand].add(row.marcoModel);
  }

  console.log(
    JSON.stringify(
      {
        overridesPath: OVERRIDES_PATH,
        modelsPath: MODELS_PATH,
        keyCount,
        uniqueLogicalCount,
        modelsCsvCount: models.length,
        added,
        updated,
        byBrandLogicalCounts: Object.fromEntries(
          Object.entries(byBrandLogical).map(([b, s]) => [b, s.size])
        ),
        missingPageUrl: BATCH_ROWS.filter((r) => !r.pageUrl).map(
          (r) => `${r.brand}:${r.key}`
        ),
      },
      null,
      2
    )
  );
}

main();
