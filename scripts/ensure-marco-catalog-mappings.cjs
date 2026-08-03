/**
 * Ensure Mobee brands/categories needed for Marco product import.
 *
 * Source of truth for writes: DIRECT_URL only.
 * Never connects to Marco.
 * Never imports products.
 *
 * Usage:
 *   node scripts/ensure-marco-catalog-mappings.cjs
 *   node scripts/ensure-marco-catalog-mappings.cjs --apply
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "ensure-marco-catalog-mappings.dry-run.json"
);

const LOCALES = ["en", "hy", "ru"];

const BRANDS = [
  {
    key: "bosch",
    slug: "bosch",
    name: "Bosch",
    nameAliases: ["bosch"],
  },
  {
    key: "lg",
    slug: "lg",
    name: "LG",
    nameAliases: ["lg"],
  },
  {
    key: "hisense",
    slug: "hisense",
    name: "Hisense",
    nameAliases: ["hisense"],
  },
  {
    key: "midea",
    slug: "midea",
    name: "Midea",
    nameAliases: ["midea"],
  },
];

const PARENT_CANDIDATE = {
  key: "household-appliances",
  titleAliases: [
    "бытовая техника",
    "крупная бытовая техника",
    "home appliances",
    "household appliances",
    "large home appliances",
    "կենցաղային տեխնիկա",
  ],
  slugAliases: [
    "household-appliances",
    "home-appliances",
    "bytovaya-tekhnika",
    "kencaxayin-texnika",
    "large-home-appliances",
  ],
};

const CATEGORIES = [
  {
    key: "refrigerators",
    translations: {
      en: { title: "Refrigerators", slug: "refrigerators" },
      ru: { title: "Холодильники", slug: "holodilniki" },
      hy: { title: "Սառնարաններ", slug: "sarnaraner" },
    },
    matchTitles: [
      "холодильники",
      "холодильник",
      "refrigerators",
      "refrigerator",
      "fridges",
      "fridge",
      "սառնարաններ",
      "սառնարան",
    ],
    matchSlugs: [
      "refrigerators",
      "refrigerator",
      "fridges",
      "fridge",
      "holodilniki",
      "sarnaraner",
    ],
    excludeTitles: [],
  },
  {
    key: "washing-machines",
    translations: {
      en: { title: "Washing Machines", slug: "washing-machines" },
      ru: { title: "Стиральные машины", slug: "stiralnye-mashiny" },
      hy: { title: "Լվացքի մեքենաներ", slug: "lvacki-mekhenaner" },
    },
    matchTitles: [
      "стиральные машины",
      "стиральная машина",
      "washing machines",
      "washing machine",
      "washers",
      "լվացքի մեքենաներ",
      "լվացքի մեքենա",
    ],
    matchSlugs: [
      "washing-machines",
      "washing-machine",
      "washers",
      "stiralnye-mashiny",
      "lvacki-mekhenaner",
    ],
    excludeTitles: [
      "посудомоечные машины",
      "посудомоечная машина",
      "dishwashers",
      "dishwasher",
      "սպասք լվացող",
    ],
  },
  {
    key: "air-conditioners",
    translations: {
      en: { title: "Air Conditioners", slug: "air-conditioners" },
      ru: { title: "Кондиционеры", slug: "konditsionery" },
      hy: { title: "Օդորակիչներ", slug: "odorakichner" },
    },
    matchTitles: [
      "кондиционеры",
      "кондиционер",
      "air conditioners",
      "air conditioner",
      "air conditioning",
      "օդորակիչներ",
      "օդորակիչ",
    ],
    matchSlugs: [
      "air-conditioners",
      "air-conditioner",
      "air-conditioning",
      "konditsionery",
      "odorakichner",
    ],
    excludeTitles: [],
  },
];

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function hostOf(url) {
  try {
    return new URL(url.replace(/^postgresql:/i, "http:")).host;
  } catch {
    return "unknown-host";
  }
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function createId() {
  return `c${Date.now().toString(36)}${crypto.randomBytes(8).toString("hex")}`;
}

function parseArgs(argv) {
  const args = { apply: false, help: false };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${raw}`);
  }
  return args;
}

function matchesAlias(haystack, aliases) {
  const text = normalizeText(haystack);
  return aliases.some((a) => text === normalizeText(a) || text.includes(normalizeText(a)));
}

function exactAlias(haystack, aliases) {
  const text = normalizeText(haystack);
  return aliases.some((a) => text === normalizeText(a));
}

function createClient(connectionString) {
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    statement_timeout: 60000,
  });
}

async function loadBrands(client) {
  const { rows } = await client.query(`
    SELECT
      b.id,
      b.slug,
      b.published,
      b."deletedAt",
      COALESCE(
        json_agg(
          json_build_object('locale', bt.locale, 'name', bt.name)
          ORDER BY bt.locale
        ) FILTER (WHERE bt.id IS NOT NULL),
        '[]'::json
      ) AS translations
    FROM brands b
    LEFT JOIN brand_translations bt ON bt."brandId" = b.id
    WHERE b."deletedAt" IS NULL
    GROUP BY b.id
    ORDER BY b.slug
  `);
  return rows;
}

async function loadCategories(client) {
  const { rows } = await client.query(`
    SELECT
      c.id,
      c."parentId",
      c.position,
      c.published,
      c."deletedAt",
      COALESCE(
        json_agg(
          json_build_object(
            'locale', ct.locale,
            'title', ct.title,
            'slug', ct.slug,
            'fullPath', ct."fullPath"
          )
          ORDER BY ct.locale
        ) FILTER (WHERE ct.id IS NOT NULL),
        '[]'::json
      ) AS translations
    FROM categories c
    LEFT JOIN category_translations ct ON ct."categoryId" = c.id
    WHERE c."deletedAt" IS NULL
    GROUP BY c.id
    ORDER BY c.position, c.id
  `);
  return rows;
}

function findBrandMatches(brands, spec) {
  const matches = [];
  for (const brand of brands) {
    const slugHit = normalizeText(brand.slug) === normalizeText(spec.slug);
    const nameHit = (brand.translations || []).some((t) =>
      exactAlias(t.name, [spec.name, ...spec.nameAliases])
    );
    if (slugHit || nameHit) matches.push(brand);
  }
  return matches;
}

function findCategoryMatches(categories, spec) {
  const matches = [];
  for (const category of categories) {
    const translations = category.translations || [];
    const excluded = translations.some((t) =>
      matchesAlias(t.title, spec.excludeTitles || [])
    );
    if (excluded) continue;

    const titleHit = translations.some((t) =>
      exactAlias(t.title, spec.matchTitles)
    );
    const slugHit = translations.some((t) =>
      exactAlias(t.slug, spec.matchSlugs) ||
      exactAlias(t.fullPath, spec.matchSlugs)
    );
    if (titleHit || slugHit) matches.push(category);
  }
  return matches;
}

function findParentCandidates(categories) {
  const matches = [];
  for (const category of categories) {
    const translations = category.translations || [];
    const titleHit = translations.some((t) =>
      exactAlias(t.title, PARENT_CANDIDATE.titleAliases)
    );
    const slugHit = translations.some(
      (t) =>
        exactAlias(t.slug, PARENT_CANDIDATE.slugAliases) ||
        exactAlias(t.fullPath, PARENT_CANDIDATE.slugAliases)
    );
    if (titleHit || slugHit) matches.push(category);
  }
  return matches;
}

function displayCategory(category) {
  if (!category) return null;
  const tr = category.translations || [];
  const ru = tr.find((t) => t.locale === "ru");
  const en = tr.find((t) => t.locale === "en");
  const hy = tr.find((t) => t.locale === "hy");
  return {
    id: category.id,
    parentId: category.parentId,
    position: category.position,
    published: category.published,
    title: ru?.title || en?.title || hy?.title || null,
    slug: en?.slug || ru?.slug || hy?.slug || null,
    fullPath: en?.fullPath || ru?.fullPath || hy?.fullPath || null,
    translations: tr,
  };
}

function nextSiblingPosition(categories, parentId) {
  let max = -1;
  for (const category of categories) {
    if ((category.parentId || null) === (parentId || null)) {
      if (Number(category.position) > max) max = Number(category.position);
    }
  }
  return max + 1;
}

function slugConflict(categories, locale, slug, excludeCategoryId = null) {
  for (const category of categories) {
    if (excludeCategoryId && category.id === excludeCategoryId) continue;
    for (const tr of category.translations || []) {
      if (tr.locale === locale && normalizeText(tr.slug) === normalizeText(slug)) {
        return category;
      }
    }
  }
  return null;
}

function planBrands(existingBrands) {
  const plans = [];
  for (const spec of BRANDS) {
    const matches = findBrandMatches(existingBrands, spec);
    if (matches.length > 1) {
      plans.push({
        kind: "brand",
        key: spec.key,
        action: "CONFLICT",
        reason: "MULTIPLE_BRAND_MATCHES",
        matches: matches.map((b) => ({
          id: b.id,
          slug: b.slug,
          translations: b.translations,
        })),
      });
      continue;
    }
    if (matches.length === 1) {
      plans.push({
        kind: "brand",
        key: spec.key,
        action: "EXISTS",
        brandId: matches[0].id,
        slug: matches[0].slug,
        published: matches[0].published,
        translations: matches[0].translations,
      });
      continue;
    }

    const slugOwner = existingBrands.find(
      (b) => normalizeText(b.slug) === normalizeText(spec.slug)
    );
    if (slugOwner) {
      plans.push({
        kind: "brand",
        key: spec.key,
        action: "CONFLICT",
        reason: "SLUG_TAKEN_BY_OTHER_BRAND",
        slug: spec.slug,
        ownerId: slugOwner.id,
      });
      continue;
    }

    const brandId = createId();
    plans.push({
      kind: "brand",
      key: spec.key,
      action: "CREATE",
      brandId,
      slug: spec.slug,
      published: true,
      translations: LOCALES.map((locale) => ({
        id: createId(),
        locale,
        name: spec.name,
      })),
    });
  }
  return plans;
}

function planCategories(existingCategories) {
  const parents = findParentCandidates(existingCategories);
  const parentPlan = {
    key: PARENT_CANDIDATE.key,
    action:
      parents.length === 1
        ? "EXISTS"
        : parents.length === 0
          ? "AMBIGUOUS_PARENT"
          : "AMBIGUOUS_PARENT",
    reason:
      parents.length === 1
        ? "SINGLE_PARENT_MATCH"
        : parents.length === 0
          ? "NO_PARENT_CANDIDATE"
          : "MULTIPLE_PARENT_CANDIDATES",
    candidates: parents.map(displayCategory),
    selected: parents.length === 1 ? displayCategory(parents[0]) : null,
  };

  const plans = [];
  let positionCursor =
    parents.length === 1
      ? nextSiblingPosition(existingCategories, parents[0].id)
      : 0;

  for (const spec of CATEGORIES) {
    const matches = findCategoryMatches(existingCategories, spec);
    if (matches.length > 1) {
      plans.push({
        kind: "category",
        key: spec.key,
        action: "CONFLICT",
        reason: "MULTIPLE_CATEGORY_MATCHES",
        matches: matches.map(displayCategory),
      });
      continue;
    }
    if (matches.length === 1) {
      plans.push({
        kind: "category",
        key: spec.key,
        action: "EXISTS",
        category: displayCategory(matches[0]),
      });
      continue;
    }

    if (parents.length !== 1) {
      plans.push({
        kind: "category",
        key: spec.key,
        action: "AMBIGUOUS_PARENT",
        reason: parentPlan.reason,
        parentCandidates: parentPlan.candidates,
        plannedTranslations: LOCALES.map((locale) => ({
          locale,
          title: spec.translations[locale].title,
          slug: spec.translations[locale].slug,
          fullPath: spec.translations[locale].slug,
        })),
      });
      continue;
    }

    const parent = parents[0];
    const conflicts = [];
    for (const locale of LOCALES) {
      const slug = spec.translations[locale].slug;
      const owner = slugConflict(existingCategories, locale, slug);
      if (owner) {
        conflicts.push({
          locale,
          slug,
          ownerId: owner.id,
          ownerTitle: displayCategory(owner).title,
        });
      }
    }
    if (conflicts.length) {
      plans.push({
        kind: "category",
        key: spec.key,
        action: "CONFLICT",
        reason: "SLUG_LOCALE_TAKEN",
        conflicts,
      });
      continue;
    }

    const categoryId = createId();
    const position = positionCursor++;
    plans.push({
      kind: "category",
      key: spec.key,
      action: "CREATE",
      categoryId,
      parentId: parent.id,
      parent: displayCategory(parent),
      position,
      published: true,
      translations: LOCALES.map((locale) => ({
        id: createId(),
        locale,
        title: spec.translations[locale].title,
        slug: spec.translations[locale].slug,
        // Match admin createCategory: fullPath currently equals locale slug.
        fullPath: spec.translations[locale].slug,
      })),
    });
  }

  return { parentPlan, categoryPlans: plans };
}

async function applyPlans(client, brandPlans, categoryPlans) {
  const now = new Date();
  await client.query("BEGIN");
  try {
    for (const plan of brandPlans) {
      if (plan.action !== "CREATE") continue;
      await client.query(
        `
        INSERT INTO brands (id, slug, published, "createdAt", "updatedAt")
        VALUES ($1, $2, true, $3, $3)
        `,
        [plan.brandId, plan.slug, now]
      );
      for (const tr of plan.translations) {
        await client.query(
          `
          INSERT INTO brand_translations (id, "brandId", locale, name)
          VALUES ($1, $2, $3, $4)
          `,
          [tr.id, plan.brandId, tr.locale, tr.name]
        );
      }
    }

    for (const plan of categoryPlans) {
      if (plan.action !== "CREATE") continue;
      await client.query(
        `
        INSERT INTO categories (
          id, "parentId", position, published, "requiresSizes", media,
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, true, false, ARRAY[]::jsonb[], $4, $4
        )
        `,
        [plan.categoryId, plan.parentId, plan.position, now]
      );
      for (const tr of plan.translations) {
        await client.query(
          `
          INSERT INTO category_translations (
            id, "categoryId", locale, title, slug, "fullPath"
          ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [tr.id, plan.categoryId, tr.locale, tr.title, tr.slug, tr.fullPath]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function verifyCreated(client, brandPlans, categoryPlans) {
  const brandIds = brandPlans
    .filter((p) => p.action === "CREATE" || p.action === "EXISTS")
    .map((p) => p.brandId)
    .filter(Boolean);
  const categoryIds = categoryPlans
    .filter((p) => p.action === "CREATE")
    .map((p) => p.categoryId)
    .concat(
      categoryPlans
        .filter((p) => p.action === "EXISTS")
        .map((p) => p.category?.id)
        .filter(Boolean)
    );

  const brands =
    brandIds.length === 0
      ? []
      : (
          await client.query(
            `
            SELECT b.id, b.slug, b.published,
              json_agg(json_build_object('locale', bt.locale, 'name', bt.name) ORDER BY bt.locale) AS translations
            FROM brands b
            JOIN brand_translations bt ON bt."brandId" = b.id
            WHERE b.id = ANY($1::text[])
            GROUP BY b.id
            ORDER BY b.slug
            `,
            [brandIds]
          )
        ).rows;

  const categories =
    categoryIds.length === 0
      ? []
      : (
          await client.query(
            `
            SELECT c.id, c."parentId", c.position, c.published,
              json_agg(json_build_object(
                'locale', ct.locale,
                'title', ct.title,
                'slug', ct.slug,
                'fullPath', ct."fullPath"
              ) ORDER BY ct.locale) AS translations
            FROM categories c
            JOIN category_translations ct ON ct."categoryId" = c.id
            WHERE c.id = ANY($1::text[])
            GROUP BY c.id
            ORDER BY c.position, c.id
            `,
            [categoryIds]
          )
        ).rows;

  return { brands, categories };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/ensure-marco-catalog-mappings.cjs
  node scripts/ensure-marco-catalog-mappings.cjs --apply`);
    return;
  }

  const env = loadEnv(path.join(process.cwd(), ".env"));
  const mobeeUrl = env.DIRECT_URL;
  if (!mobeeUrl) throw new Error("Missing DIRECT_URL");

  const client = createClient(mobeeUrl);
  await client.connect();

  const report = {
    mode: args.apply ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    mobeeTargetEnv: "DIRECT_URL",
    mobeeHost: hostOf(mobeeUrl),
    marcoTouched: false,
    productsTouched: false,
    writes: Boolean(args.apply),
    parent: null,
    brands: [],
    categories: [],
    counts: {
      EXISTS: 0,
      CREATE: 0,
      CONFLICT: 0,
      AMBIGUOUS_PARENT: 0,
    },
    verification: null,
  };

  try {
    await client.query("BEGIN READ ONLY");
    const existingBrands = await loadBrands(client);
    const existingCategories = await loadCategories(client);
    await client.query("COMMIT");

    const brandPlans = planBrands(existingBrands);
    const { parentPlan, categoryPlans } = planCategories(existingCategories);

    report.parent = parentPlan;
    report.brands = brandPlans;
    report.categories = categoryPlans;

    for (const plan of [...brandPlans, ...categoryPlans]) {
      report.counts[plan.action] = (report.counts[plan.action] || 0) + 1;
    }

    const hasBlocking =
      brandPlans.some((p) => p.action === "CONFLICT") ||
      categoryPlans.some(
        (p) => p.action === "CONFLICT" || p.action === "AMBIGUOUS_PARENT"
      ) ||
      parentPlan.action === "AMBIGUOUS_PARENT";

    if (args.apply) {
      if (hasBlocking) {
        throw new Error(
          "Refusing --apply because plan has CONFLICT or AMBIGUOUS_PARENT"
        );
      }
      await applyPlans(client, brandPlans, categoryPlans);
      await client.query("BEGIN READ ONLY");
      report.verification = await verifyCreated(
        client,
        brandPlans,
        categoryPlans
      );
      await client.query("COMMIT");
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

    console.log("=== ENSURE MARCO CATALOG MAPPINGS ===");
    console.log(
      JSON.stringify(
        {
          mode: report.mode,
          mobeeHost: report.mobeeHost,
          marcoTouched: false,
          productsTouched: false,
          writes: report.writes,
          reportPath: REPORT_PATH,
        },
        null,
        2
      )
    );

    console.log("\n## Parent");
    console.log(
      JSON.stringify(
        {
          action: parentPlan.action,
          reason: parentPlan.reason,
          selected: parentPlan.selected,
          candidates: parentPlan.candidates,
        },
        null,
        2
      )
    );

    console.log("\n## Brands");
    for (const plan of brandPlans) {
      console.log(
        `- [${plan.action}] ${plan.key}` +
          (plan.brandId ? ` id=${plan.brandId}` : "") +
          (plan.slug ? ` slug=${plan.slug}` : "") +
          (plan.reason ? ` (${plan.reason})` : "")
      );
      if (plan.translations) {
        for (const tr of plan.translations) {
          console.log(`    ${tr.locale}: ${tr.name}`);
        }
      }
    }

    console.log("\n## Categories");
    for (const plan of categoryPlans) {
      console.log(
        `- [${plan.action}] ${plan.key}` +
          (plan.categoryId ? ` id=${plan.categoryId}` : "") +
          (plan.category?.id ? ` id=${plan.category.id}` : "") +
          (plan.reason ? ` (${plan.reason})` : "")
      );
      if (plan.parentId) {
        console.log(
          `    parentId=${plan.parentId} parent=${plan.parent?.title || ""}`
        );
      }
      if (plan.position != null) console.log(`    position=${plan.position}`);
      const trs = plan.translations || plan.plannedTranslations || plan.category?.translations;
      if (trs) {
        for (const tr of trs) {
          console.log(
            `    ${tr.locale}: ${tr.title} | slug=${tr.slug} | fullPath=${tr.fullPath}`
          );
        }
      }
    }

    console.log("\n## Counts");
    console.log(JSON.stringify(report.counts, null, 2));

    if (args.apply && report.verification) {
      console.log("\n## Verification SELECT");
      console.log(JSON.stringify(report.verification, null, 2));
    }

    if (!args.apply) {
      console.log("\nDry-run only. Use --apply to write.");
    }
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
