import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAttributeFacetLightRows = vi.fn();
vi.mock("@/lib/catalog/fetch-attribute-facet-rows", () => ({
  fetchAttributeFacetLightRows: (ids: string[]) => fetchAttributeFacetLightRows(ids),
}));

import { resolveListingAttributeFacetEntries } from "./products-plp-attribute-facets";

describe("resolveListingAttributeFacetEntries", () => {
  beforeEach(() => {
    fetchAttributeFacetLightRows.mockReset();
  });

  it("uses projected entries without querying variants", async () => {
    const result = await resolveListingAttributeFacetEntries(
      [{ productId: "p1", attributeFacets: [["ram", "8GB"]] }],
      "en",
    );
    expect(result).toEqual([[["ram", "8GB"]]]);
    expect(fetchAttributeFacetLightRows).not.toHaveBeenCalled();
  });

  it("falls back to live variants for NULL rows and keeps input order", async () => {
    fetchAttributeFacetLightRows.mockResolvedValue([
      {
        id: "p2",
        createdAt: new Date(0),
        variants: [{ price: 1, options: [{ attributeKey: "storage", value: "1TB" }] }],
      },
    ]);
    const result = await resolveListingAttributeFacetEntries(
      [
        { productId: "p1", attributeFacets: [["ram", "8GB"]] },
        { productId: "p2", attributeFacets: null },
        { productId: "p3", attributeFacets: null },
      ],
      "en",
    );
    expect(fetchAttributeFacetLightRows).toHaveBeenCalledWith(["p2", "p3"]);
    expect(result).toEqual([[["ram", "8GB"]], [["storage", "1TB"]], []]);
  });
});
