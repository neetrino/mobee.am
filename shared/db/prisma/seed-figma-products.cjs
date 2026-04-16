/**
 * Seeds Figma showcase products (file LUJV4093… node 53:684). Data: seed-figma-products-data.cjs
 * Run: pnpm run db:seed:figma
 */
const path = require("path");
const fs = require("fs");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  content.split("\n").forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith("#")) {
      const eq = t.indexOf("=");
      if (eq > 0) {
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  });
}
loadEnv(path.join(__dirname, "../../.env"));
loadEnv(path.join(process.cwd(), ".env"));

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { SLUGS, COLOR_SPECS, PRODUCTS } = require("./seed-figma-products-data.cjs");

async function findElectronicsCategoryId() {
  const row = await prisma.category.findFirst({
    where: { translations: { some: { locale: "en", slug: "electronics" } } },
  });
  return row?.id ?? null;
}

async function findOrCreateBrand(slug, nameEn) {
  let b = await prisma.brand.findUnique({ where: { slug } });
  if (b) return b;
  return prisma.brand.create({
    data: {
      slug,
      published: true,
      translations: { create: { locale: "en", name: nameEn } },
    },
  });
}

async function findOrCreateChildCategory(parentId, slug, title, fullPath) {
  let cat = await prisma.category.findFirst({
    where: { translations: { some: { locale: "en", slug } } },
  });
  if (cat) return cat;
  return prisma.category.create({
    data: {
      parentId,
      position: 0,
      published: true,
      media: [],
      translations: {
        create: { locale: "en", title, slug, fullPath },
      },
    },
  });
}

async function ensureColorAttributeAndValues() {
  let attr = await prisma.attribute.findUnique({ where: { key: "color" } });
  if (!attr) {
    attr = await prisma.attribute.create({
      data: {
        key: "color",
        type: "select",
        filterable: true,
        position: 0,
        translations: {
          create: [
            { locale: "en", name: "Color" },
            { locale: "hy", name: "Գույն" },
            { locale: "ru", name: "Цвет" },
          ],
        },
      },
    });
  } else {
    await prisma.attributeTranslation.createMany({
      data: [
        { attributeId: attr.id, locale: "hy", name: "Գույն" },
        { attributeId: attr.id, locale: "ru", name: "Цвет" },
      ],
      skipDuplicates: true,
    });
  }

  const valueIds = [];
  for (const c of COLOR_SPECS) {
    let av = await prisma.attributeValue.findFirst({
      where: { attributeId: attr.id, value: c.value },
    });
    if (!av) {
      av = await prisma.attributeValue.create({
        data: {
          attributeId: attr.id,
          value: c.value,
          position: c.position,
          colors: c.colors,
          translations: {
            create: [
              { locale: "en", label: c.labels.en },
              { locale: "hy", label: c.labels.hy },
              { locale: "ru", label: c.labels.ru },
            ],
          },
        },
      });
    } else {
      await prisma.attributeValue.update({
        where: { id: av.id },
        data: { colors: c.colors, position: c.position },
      });
    }
    valueIds.push(av.id);
  }
  return { attributeId: attr.id, valueIds };
}

async function removeExistingShowcaseProducts() {
  const translations = await prisma.productTranslation.findMany({
    where: { locale: "en", slug: { in: SLUGS } },
    select: { productId: true },
  });
  const ids = [...new Set(translations.map((t) => t.productId))];
  if (ids.length === 0) return;
  await prisma.product.deleteMany({ where: { id: { in: ids } } });
  console.log("[seed-figma] Removed", ids.length, "existing showcase product(s).");
}

function placeholderMedia(slug) {
  return [
    { url: `https://picsum.photos/seed/mobee-${slug}-1/800/800` },
    { url: `https://picsum.photos/seed/mobee-${slug}-2/800/800` },
    { url: `https://picsum.photos/seed/mobee-${slug}-3/800/800` },
  ];
}

async function main() {
  console.log("=== Figma showcase products seed ===");
  await removeExistingShowcaseProducts();

  const electronicsId = await findElectronicsCategoryId();
  if (!electronicsId) {
    console.warn("[seed-figma] No 'electronics' category (en). Creating iphone/ipad as root categories.");
  }
  const parentId = electronicsId ?? null;

  const iphoneCat = await findOrCreateChildCategory(
    parentId,
    "iphone",
    "iPhone",
    parentId ? "electronics/iphone" : "iphone"
  );
  const ipadCat = await findOrCreateChildCategory(
    parentId,
    "ipad",
    "iPad",
    parentId ? "electronics/ipad" : "ipad"
  );

  const brandIphone = await findOrCreateBrand("apple-iphone-line", "iPhone");
  const brandIpad = await findOrCreateBrand("apple-ipad-line", "iPad");

  const { attributeId: colorAttrId, valueIds } = await ensureColorAttributeAndValues();

  for (const p of PRODUCTS) {
    const categoryId = p.categorySlug === "iphone" ? iphoneCat.id : ipadCat.id;
    const brandId = p.brandSlug === "apple-iphone-line" ? brandIphone.id : brandIpad.id;
    const media = placeholderMedia(p.slug);

    const translationsCreate = ["en", "hy", "ru"].map((locale) => ({
      locale,
      title: p.translations[locale].title,
      slug: p.slug,
      subtitle: p.translations[locale].subtitle,
      descriptionHtml: p.translations[locale].descriptionHtml,
    }));

    const labelsData =
      p.label != null
        ? {
            create: {
              type: "text",
              value: p.label.value,
              position: "top-left",
              color: p.label.color,
            },
          }
        : undefined;

    await prisma.product.create({
      data: {
        brandId,
        media,
        published: true,
        featured: true,
        publishedAt: new Date(),
        categoryIds: [categoryId],
        primaryCategoryId: categoryId,
        attributeIds: [colorAttrId],
        discountPercent: 0,
        categories: { connect: [{ id: categoryId }] },
        productAttributes: {
          create: { attributeId: colorAttrId },
        },
        labels: labelsData,
        translations: { create: translationsCreate },
        variants: {
          create: valueIds.map((valueId, i) => ({
            price: p.price,
            compareAtPrice: p.compareAt,
            stock: p.stock,
            sku: `mobee-figma-${p.slug}-c${i + 1}`,
            position: i,
            published: true,
            imageUrl: `https://picsum.photos/seed/mobee-${p.slug}-var-${i + 1}/600/600`,
            options: {
              create: { valueId },
            },
          })),
        },
      },
    });

    console.log("[seed-figma] Created:", p.slug);
  }

  console.log("=== Done ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
