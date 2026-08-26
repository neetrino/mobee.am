/**
 * Remaining catalog probes after a connection reset.
 */
import { db } from "@white-shop/db";
import { findCatalogProductPage } from "../src/lib/catalog/catalog-find";
import { getCatalogFacets } from "../src/lib/catalog/catalog-facets";

async function main(): Promise<void> {
  const sony = await findCatalogProductPage({
    brand: "sony",
    page: 1,
    limit: 12,
    lang: "en",
  });
  process.stdout.write(`list brand=Sony total=${sony.total} page1=${sony.products.length}\n`);

  const spaceBlack = await findCatalogProductPage({
    colors: "Space Black",
    page: 1,
    limit: 12,
    lang: "en",
  });
  process.stdout.write(`list colors=Space Black total=${spaceBlack.total}\n`);

  const search = await findCatalogProductPage({
    search: "a",
    page: 1,
    limit: 12,
    lang: "en",
  });
  process.stdout.write(`list search=a total=${search.total}\n`);

  const facets = await getCatalogFacets({ lang: "en" });
  const appleFacet = facets.brands.find((item) => item.name.toLowerCase() === "apple");
  process.stdout.write(
    `facets brands=${facets.brands.length} apple_facet=${appleFacet?.count ?? 0} price_has=${facets.priceRange.hasProducts}\n`,
  );
}

main()
  .catch((error: unknown) => {
    const name = error instanceof Error ? error.name : "Error";
    process.stderr.write(`catalog_result_probe_failed name=${name}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
