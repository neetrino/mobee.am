import type { PrismaClient } from "../../shared/db/generated/client";
import { loadRootEnv, silencePrismaQueryLogsForCli } from "./load-root-env";

loadRootEnv();
silencePrismaQueryLogsForCli();

type TranslationRow = {
  locale: string;
  title: string;
  slug: string;
  fullPath: string;
};

const ATTRIBUTE_NAMES: Readonly<Record<string, { hy: string; en: string; ru: string }>> = {
  storage: { en: "Storage", hy: "Պահեստ", ru: "Память" },
  size: { en: "Size", hy: "Չափս", ru: "Размер" },
  connectivity: { en: "Connectivity", hy: "Կապ", ru: "Связь" },
  band_color: { en: "Band Color", hy: "Ժապավենի գույն", ru: "Цвет ремешка" },
  band_type: { en: "Band Type", hy: "Ժապավենի տեսակ", ru: "Тип ремешка" },
  band_size: { en: "Band Size", hy: "Ժապավենի չափս", ru: "Размер ремешка" },
  case_material: { en: "Case Material", hy: "Կորպուսի նյութ", ru: "Материал корпуса" },
};

const COLOR_LABELS: Readonly<Record<string, { hy: string; en: string; ru: string }>> = {
  white: { en: "White", hy: "Սպիտակ", ru: "Белый" },
  black: { en: "Black", hy: "Սև", ru: "Чёрный" },
  blue: { en: "Blue", hy: "Կապույտ", ru: "Синий" },
  red: { en: "Red", hy: "Կարմիր", ru: "Красный" },
  pink: { en: "Pink", hy: "Վարդագույն", ru: "Розовый" },
  purple: { en: "Purple", hy: "Մանուշակագույն", ru: "Фиолетовый" },
  grey: { en: "Grey", hy: "Մոխրագույն", ru: "Серый" },
  gray: { en: "Gray", hy: "Մոխրագույն", ru: "Серый" },
  gold: { en: "Gold", hy: "Ոսկեգույն", ru: "Золотой" },
  silver: { en: "Silver", hy: "Արծաթագույն", ru: "Серебристый" },
  orange: { en: "Orange", hy: "Նարնջագույն", ru: "Оранжевый" },
  yellow: { en: "Yellow", hy: "Դեղին", ru: "Жёлтый" },
  green: { en: "Green", hy: "Կանաչ", ru: "Зелёный" },
  navy: { en: "Navy", hy: "Մուգ կապույտ", ru: "Тёмно-синий" },
  teal: { en: "Teal", hy: "Ծովակնագույն", ru: "Бирюзовый" },
  beige: { en: "Beige", hy: "Բեժ", ru: "Бежевый" },
  brown: { en: "Brown", hy: "Շագանակագույն", ru: "Коричневый" },
  transparent: { en: "Transparent", hy: "Թափանցիկ", ru: "Прозрачный" },
  clear: { en: "Clear", hy: "Թափանցիկ", ru: "Прозрачный" },
  midnight: { en: "Midnight", hy: "Կեսգիշերային", ru: "Ночной" },
  starlight: { en: "Starlight", hy: "Աստղային", ru: "Сияющий" },
  sky: { en: "Sky", hy: "Երկնագույն", ru: "Небесный" },
  indigo: { en: "Indigo", hy: "Ինդիգո", ru: "Индиго" },
  lavender: { en: "Lavender", hy: "Լավանդա", ru: "Лавандовый" },
  sage: { en: "Sage", hy: "Եղեսպակ", ru: "Шалфейный" },
  tan: { en: "Tan", hy: "Դարչնագույն", ru: "Бежевый" },
  aluminium: { en: "Aluminium", hy: "Ալյումին", ru: "Алюминий" },
  titanium: { en: "Titanium", hy: "Տիտան", ru: "Титан" },
};

function sourceCategoryTitle(translations: TranslationRow[]): string {
  const byLocale = new Map(translations.map((row) => [row.locale, row.title.trim()]));
  return byLocale.get("hy") || byLocale.get("en") || byLocale.get("ru") || translations[0]?.title.trim() || "";
}

async function main(): Promise<void> {
  process.stdout.write("Connecting to database...\n");
  const { PrismaClient } = await import("../../shared/db/generated/client");
  const db: PrismaClient = new PrismaClient();
  const { categoryLocaleTitlesToWrite } = await import("@/lib/category-locale-sync");
  const { containsArmenianScript } = await import("@/lib/pickCategoryTranslation");
  const { toSlug } = await import("@/lib/utils/slug");

  process.stdout.write("Translating categories...\n");
  const categoriesUpdated = await translateCategories(
    db,
    categoryLocaleTitlesToWrite,
    containsArmenianScript,
    toSlug,
  );
  process.stdout.write(`Categories updated: ${categoriesUpdated}\n`);

  process.stdout.write("Translating attribute names...\n");
  const attributesUpdated = await translateAttributeNames(db);
  process.stdout.write(`Attribute names updated: ${attributesUpdated}\n`);

  process.stdout.write("Translating color labels...\n");
  const colorsUpdated = await translateColorLabels(db);
  process.stdout.write(`Color labels updated: ${colorsUpdated}\n`);

  await db.$disconnect();

  process.stdout.write("Invalidating caches...\n");
  const { invalidateCatalogReadCaches } = await import(
    "@/lib/services/read-through-json-cache"
  );
  await invalidateCatalogReadCaches();

  process.stdout.write("Rebuilding product listing read model...\n");
  const { rebuildProductListingReadModel } = await import(
    "@/lib/read-model/product-read-model-sync"
  );
  await rebuildProductListingReadModel();
  process.stdout.write(
    `Done. categories=${categoriesUpdated} attributeNames=${attributesUpdated} colorLabels=${colorsUpdated}\n`,
  );
}

async function translateCategories(
  db: PrismaClient,
  categoryLocaleTitlesToWrite: (title: string) => Array<{ locale: string; title: string }>,
  containsArmenianScript: (value: string) => boolean,
  toSlug: (input: string) => string,
): Promise<number> {
  const categories = await db.category.findMany({
    where: { deletedAt: null },
    include: { translations: true },
  });

  let updated = 0;
  for (const category of categories) {
    const translations = category.translations as TranslationRow[];
    const sourceTitle = sourceCategoryTitle(translations);
    const writes = categoryLocaleTitlesToWrite(sourceTitle);
    const enTitle = writes.find((row) => row.locale === "en")?.title || sourceTitle;
    const sharedSlug =
      translations.find((row) => row.slug.trim() && !containsArmenianScript(row.slug))?.slug.trim() ||
      toSlug(enTitle);

    for (const write of writes) {
      const existing = translations.find((row) => row.locale === write.locale);
      const nextSlug = existing?.slug.trim() || sharedSlug;
      const nextFullPath = existing?.fullPath.trim() || nextSlug;
      if (
        existing?.title === write.title &&
        existing.slug === nextSlug &&
        existing.fullPath === nextFullPath
      ) {
        continue;
      }

      await db.categoryTranslation.upsert({
        where: {
          categoryId_locale: { categoryId: category.id, locale: write.locale },
        },
        create: {
          categoryId: category.id,
          locale: write.locale,
          title: write.title,
          slug: nextSlug,
          fullPath: nextFullPath,
        },
        update: {
          title: write.title,
          slug: nextSlug,
          fullPath: nextFullPath,
        },
      });
      updated += 1;
    }
  }

  return updated;
}

async function translateAttributeNames(db: PrismaClient): Promise<number> {
  const attributes = await db.attribute.findMany({
    where: { key: { in: Object.keys(ATTRIBUTE_NAMES) } },
    include: { translations: true },
  });

  let updated = 0;
  for (const attribute of attributes) {
    const names = ATTRIBUTE_NAMES[attribute.key];
    if (!names) continue;
    for (const locale of ["hy", "en", "ru"] as const) {
      await db.attributeTranslation.upsert({
        where: { attributeId_locale: { attributeId: attribute.id, locale } },
        create: { attributeId: attribute.id, locale, name: names[locale] },
        update: { name: names[locale] },
      });
      updated += 1;
    }
  }
  return updated;
}

async function translateColorLabels(db: PrismaClient): Promise<number> {
  const color = await db.attribute.findFirst({
    where: { key: "color" },
    include: { values: { include: { translations: true } } },
  });
  const material = await db.attribute.findFirst({
    where: { key: "case_material" },
    include: { values: { include: { translations: true } } },
  });

  const values = [...(color?.values ?? []), ...(material?.values ?? [])];
  let updated = 0;
  for (const value of values) {
    const labels = COLOR_LABELS[value.value.trim().toLowerCase()];
    if (!labels) continue;
    for (const locale of ["hy", "en", "ru"] as const) {
      await db.attributeValueTranslation.upsert({
        where: {
          attributeValueId_locale: { attributeValueId: value.id, locale },
        },
        create: { attributeValueId: value.id, locale, label: labels[locale] },
        update: { label: labels[locale] },
      });
      updated += 1;
    }
  }
  return updated;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
