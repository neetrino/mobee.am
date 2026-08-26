import { loadRootEnv, silencePrismaQueryLogsForCli } from "./load-root-env";

loadRootEnv();
silencePrismaQueryLogsForCli();

async function main(): Promise<void> {
  const { db } = await import("@white-shop/db");
  const [products, listing, pdp] = await Promise.all([
    db.product.count({ where: { published: true, deletedAt: null } }),
    db.productListingRow.count({ where: { isPublished: true, deletedAt: null } }),
    db.productPdpRow.count({ where: { isPublished: true } }),
  ]);

  const listingLocales = await db.productListingRow.groupBy({
    by: ["locale"],
    where: { isPublished: true, deletedAt: null },
    _count: { _all: true },
  });

  process.stdout.write(
    JSON.stringify(
      {
        publishedProducts: products,
        listingRows: listing,
        pdpRows: pdp,
        listingByLocale: listingLocales.map((row) => ({
          locale: row.locale,
          count: row._count._all,
        })),
        listingDrift: listing < products,
        pdpDrift: pdp < products,
      },
      null,
      2,
    ) + "\n",
  );

  if (listing < products || pdp < products) {
    process.exit(2);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
