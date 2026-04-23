import { describe, expect, it } from "vitest";
import { getHomeSectionOwnership, HOME_SECTION_OWNERSHIP } from "./homeSections";

describe("homeSections ownership", () => {
  it("covers all expected homepage sections", () => {
    expect(HOME_SECTION_OWNERSHIP).toHaveLength(7);
  });

  it("maps curated product sections to admin API sources", () => {
    expect(getHomeSectionOwnership("featuredProducts")).toEqual({
      id: "featuredProducts",
      dataSource: "adminApi",
      owner: "/api/v1/products?filter=new",
    });

    expect(getHomeSectionOwnership("specialOffers")).toEqual({
      id: "specialOffers",
      dataSource: "adminApi",
      owner: "/api/v1/products?filter=featured",
    });
  });

  it("maps content-only sections to locale static resources", () => {
    expect(getHomeSectionOwnership("hero").dataSource).toBe("localeStatic");
    expect(getHomeSectionOwnership("partnerLogos").owner).toBe("src/locales/*/home.json");
  });
});
