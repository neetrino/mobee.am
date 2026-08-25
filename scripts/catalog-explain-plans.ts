/**
 * Local catalog query-plan probe. Does not print connection strings.
 */
import { Prisma } from "@white-shop/db";
import { db } from "@white-shop/db";

type PlanRow = { "QUERY PLAN": string };

function printPlan(title: string, rows: PlanRow[]): void {
  const text = rows.map((row) => row["QUERY PLAN"]).join("\n");
  const indexHit = /Index (Scan|Only Scan|Seek)/i.test(text);
  const seqHit = /Seq Scan/i.test(text);
  const exec = text.match(/Execution Time: ([\d.]+) ms/i)?.[1] ?? "n/a";
  process.stdout.write(
    `${title}\n  index_access=${indexHit} seq_scan=${seqHit} execution_ms=${exec}\n`,
  );
}

async function countBrand(name: string): Promise<number> {
  const brand = await db.brand.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { slug: { equals: name.toLowerCase(), mode: "insensitive" } },
        { translations: { some: { name: { equals: name, mode: "insensitive" } } } },
      ],
    },
    select: { id: true },
  });
  if (!brand) return 0;
  return db.product.count({
    where: { published: true, deletedAt: null, brandId: brand.id },
  });
}

async function main(): Promise<void> {
  await db.$queryRaw<Array<{ ok: number }>>(Prisma.sql`SELECT 1 AS ok`);

  const published = await db.product.count({
    where: { published: true, deletedAt: null },
  });
  const names = ["Apple", "Samsung", "Hisense", "LG", "Dyson", "Sony"];
  const counts = await Promise.all(names.map(async (name) => `${name}=${await countBrand(name)}`));
  process.stdout.write(`published_products=${published} ${counts.join(" ")}\n`);

  const apple = await db.brand.findFirst({
    where: {
      deletedAt: null,
      translations: { some: { name: { equals: "Apple", mode: "insensitive" } } },
    },
    select: { id: true },
  });

  if (apple) {
    printPlan(
      "brand_filter",
      await db.$queryRaw<PlanRow[]>(Prisma.sql`
        EXPLAIN ANALYZE
        SELECT id FROM products
        WHERE published = true AND "deletedAt" IS NULL AND "brandId" = ${apple.id}
        ORDER BY "createdAt" DESC
        LIMIT 12
      `),
    );
  }

  printPlan(
    "published_deleted_filter",
    await db.$queryRaw<PlanRow[]>(Prisma.sql`
      EXPLAIN ANALYZE
      SELECT id FROM products
      WHERE published = true AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 12
    `),
  );

  printPlan(
    "variant_option_color",
    await db.$queryRaw<PlanRow[]>(Prisma.sql`
      EXPLAIN ANALYZE
      SELECT p.id FROM products p
      WHERE p.published = true AND p."deletedAt" IS NULL
        AND EXISTS (
          SELECT 1 FROM product_variants v
          JOIN product_variant_options o ON o."variantId" = v.id
          LEFT JOIN attribute_values av ON av.id = o."valueId"
          LEFT JOIN attributes a ON a.id = av."attributeId"
          WHERE v."productId" = p.id AND v.published = true
            AND (a.key = 'color' OR o."attributeKey" ILIKE 'color')
        )
      LIMIT 12
    `),
  );

  printPlan(
    "search_title",
    await db.$queryRaw<PlanRow[]>(Prisma.sql`
      EXPLAIN ANALYZE
      SELECT p.id FROM products p
      WHERE p.published = true AND p."deletedAt" IS NULL
        AND EXISTS (
          SELECT 1 FROM product_translations t
          WHERE t."productId" = p.id AND t.title ILIKE ${"%a%"}
        )
      LIMIT 12
    `),
  );
}

main()
  .catch((error: unknown) => {
    const name = error instanceof Error ? error.name : "Error";
    process.stderr.write(`catalog_explain_failed name=${name}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
