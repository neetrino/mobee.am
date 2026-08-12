"use strict";

/**
 * Merge retry-28 overrides into official-product-page-overrides.json
 * and write product-ids scope file.
 */

const fs = require("fs");
const path = require("path");
const {
  buildOverrideMaps,
  PRODUCT_IDS,
  BATCH_ROWS,
} = require("./lib/official-images/approved-retry-28-batch.cjs");

const OVERRIDES_PATH = path.join(
  process.cwd(),
  "scripts",
  "official-product-page-overrides.json"
);
const IDS_PATH = path.join(
  process.cwd(),
  "tmp",
  "official-images-retry-28-product-ids.txt"
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
  fs.mkdirSync(path.dirname(IDS_PATH), { recursive: true });
  fs.writeFileSync(IDS_PATH, `${PRODUCT_IDS.join("\n")}\n`);

  console.log(
    JSON.stringify(
      {
        overridesPath: OVERRIDES_PATH,
        idsPath: IDS_PATH,
        keyCount,
        uniqueLogicalCount,
        productIds: PRODUCT_IDS.length,
        added,
        updated,
        rows: BATCH_ROWS.length,
      },
      null,
      2
    )
  );
}

main();
