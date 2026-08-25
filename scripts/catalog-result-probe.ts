/**
 * Local catalog result probe. Prints counts only, never connection strings.
 */
import { db } from "@white-shop/db";
import { findCatalogProductPage } from "../src/lib/catalog/catalog-find";
import { getCatalogFacets } from "../src/lib/catalog/catalog-facets";

async function printBrand(name: string): Promise<void> {
  const list = await findCatalogProductPage({
    brand: name.toLowerCase(),
    page: 1,
    limit: 12,
    lang: "en",
  });
  const page2 = await findCatalogProductPage({
    brand: name.toLowerCase(),
    page: 2,
    limit: 12,
    lang: "en",
  });
  process.stdout.write(
    `list brand=${name} total=${list.total} page1=${list.products.length} page2=${page2.products.length} overlap=${
      list.products.some((item) => page2.products.some((other) => other.id === item.id))
    }\n`,
  );
}

async function main(): Promise<void> {
  for (const name of ["Apple", "Samsung", "Hisense", "LG", "Dyson", "Sony"]) {
    await printBrand(name);
  }

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
    `facets brands=${facets.brands.length} apple_facet=${appleFacet?.count ?? 0} price_min=${facets.priceRange.min} price_max=${facets.priceRange.max}\n`,
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
