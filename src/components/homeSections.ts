export type HomeSectionId =
  | "hero"
  | "topCategories"
  | "featuredIntro"
  | "featuredProducts"
  | "specialOffers"
  | "whyChooseUs"
  | "partnerLogos";

export type HomeSectionDataSource = "adminApi" | "localeStatic";

export interface HomeSectionOwnership {
  id: HomeSectionId;
  dataSource: HomeSectionDataSource;
  owner: string;
}

export const HOME_SECTION_OWNERSHIP: readonly HomeSectionOwnership[] = [
  { id: "hero", dataSource: "localeStatic", owner: "src/locales/*/home.json" },
  { id: "topCategories", dataSource: "adminApi", owner: "/api/v1/categories" },
  { id: "featuredIntro", dataSource: "localeStatic", owner: "src/locales/*/home.json" },
  { id: "featuredProducts", dataSource: "adminApi", owner: "/api/v1/products?filter=new" },
  { id: "specialOffers", dataSource: "adminApi", owner: "/api/v1/products?filter=featured" },
  { id: "whyChooseUs", dataSource: "localeStatic", owner: "src/locales/*/home.json" },
  { id: "partnerLogos", dataSource: "localeStatic", owner: "src/locales/*/home.json" },
] as const;

export function getHomeSectionOwnership(sectionId: HomeSectionId): HomeSectionOwnership {
  const section = HOME_SECTION_OWNERSHIP.find((item) => item.id === sectionId);
  if (!section) {
    throw new Error(`Unknown home section id: ${sectionId}`);
  }

  return section;
}
