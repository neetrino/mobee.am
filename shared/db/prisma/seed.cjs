const path = require("path");
const fs = require("fs");

// Load .env: try project root (../.. from shared/db/prisma) then cwd
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
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "electronics", title: "Electronics" },
  { slug: "clothing", title: "Clothing" },
  { slug: "shoes", title: "Shoes" },
  { slug: "home", title: "Home & Garden" },
  { slug: "sports", title: "Sports" },
  { slug: "books", title: "Books" },
  { slug: "accessories", title: "Accessories" },
];

const BRANDS = [
  { slug: "acme", name: "Acme" },
  { slug: "brand-x", name: "Brand X" },
  { slug: "prime", name: "Prime" },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedAdmin() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    const roles = Array.isArray(existing.roles) ? existing.roles : [];
    const hasAdmin = roles.includes("admin");
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        roles: hasAdmin ? roles : [...roles, "admin"],
        passwordHash: adminPassword ? await bcrypt.hash(adminPassword, 10) : existing.passwordHash,
      },
    });
    console.log("[Seed] Admin user updated:", adminEmail);
  } else {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        roles: ["admin"],
        emailVerified: true,
        locale: "en",
      },
    });
    console.log("[Seed] Admin user created:", adminEmail);
  }
}

async function seedCategories() {
  const ids = [];
  for (let i = 0; i < CATEGORIES.length; i++) {
    const { slug, title } = CATEGORIES[i];
    const existing = await prisma.category.findFirst({
      where: { translations: { some: { slug, locale: "en" } } },
    });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const cat = await prisma.category.create({
      data: {
        position: i,
        published: true,
        media: [],
        translations: {
          create: {
            locale: "en",
            title,
            slug,
            fullPath: slug,
          },
        },
      },
    });
    ids.push(cat.id);
  }
  console.log("[Seed] Categories:", ids.length);
  return ids;
}

async function seedBrands() {
  const ids = [];
  for (const { slug, name } of BRANDS) {
    let brand = await prisma.brand.findUnique({ where: { slug } });
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          slug,
          published: true,
          translations: {
            create: { locale: "en", name },
          },
        },
      });
    }
    ids.push(brand.id);
  }
  console.log("[Seed] Brands:", ids.length);
  return ids;
}

async function seedProducts(categoryIds, brandIds) {
  const titles = [
    "Wireless Earbuds", "Running Shoes", "Cotton T-Shirt", "Desk Lamp", "Yoga Mat",
    "Water Bottle", "Backpack", "Smart Watch", "Sunglasses", "Notebook Set",
    "Bluetooth Speaker", "Winter Jacket", "Canvas Sneakers", "Throw Pillow", "Dumbbells",
    "Novel - The Journey", "Leather Belt", "Phone Stand", "Coffee Mug", "Garden Seeds",
    "Hiking Boots", "Polo Shirt", "Desk Organizer", "Resistance Bands", "Cookbook",
    "Wallet", "USB Hub", "Blanket", "Jump Rope", "Short Story Collection",
    "Cap", "Keyboard", "Curtains", "Kettlebell", "Poetry Book",
    "Scarf", "Mouse Pad", "Rug", "Foam Roller", "Essay Collection",
    "Socks Pack", "Monitor Stand", "Vase", "Pull-Up Bar", "Biography",
    "Gloves", "Cable Organizer", "Cushion", "Running Belt", "Art Book",
  ];
  const created = [];
  for (let i = 0; i < 50; i++) {
    const title = titles[i] || `Product ${i + 1}`;
    const slug = `seed-${slugify(title)}-${i + 1}`;
    const catIndex = i % categoryIds.length;
    const primaryCategoryId = categoryIds[catIndex];
    const categoryIdsList = [primaryCategoryId];
    const brandId = i % 3 === 0 ? brandIds[i % brandIds.length] : null;
    const price = 1999 + (i % 50) * 500;
    const stock = 10 + (i % 91);
    const featured = i < 10;
    const product = await prisma.product.create({
      data: {
        brandId,
        media: [],
        published: true,
        featured,
        publishedAt: new Date(),
        categoryIds: categoryIdsList,
        primaryCategoryId,
        attributeIds: [],
        categories: { connect: categoryIdsList.map((id) => ({ id })) },
        translations: {
          create: {
            locale: "en",
            title,
            slug,
            subtitle: `Quality ${title.toLowerCase()}`,
            descriptionHtml: `<p>Great product for everyday use. Item #${i + 1}.</p>`,
          },
        },
        variants: {
          create: {
            price,
            compareAtPrice: price * 1.2,
            stock,
            sku: `SKU-${1000 + i}`,
            position: 0,
            published: true,
          },
        },
      },
    });
    created.push(product.id);
  }
  console.log("[Seed] Products created:", created.length);
  return created;
}

async function main() {
  console.log("=== Seed start ===");
  try {
    await seedAdmin();
    const categoryIds = await seedCategories();
    const brandIds = await seedBrands();
    await seedProducts(categoryIds, brandIds);
    console.log("=== Seed done ===");
  } catch (e) {
    console.error("Seed error:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
