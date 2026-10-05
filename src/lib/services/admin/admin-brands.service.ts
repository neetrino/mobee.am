import { db } from "@white-shop/db";
import {
  DEFAULT_ADMIN_CONTENT_LOCALE,
  parseAdminContentLocale,
} from "@/lib/admin/admin-content-locale";
import { logger } from "@/lib/utils/logger";
import { toSlug } from "@/lib/utils/slug";
import { syncProductListingReadModelByBrand } from "@/lib/read-model/product-read-model-sync";

class AdminBrandsService {
  /**
   * Get brands for admin (names resolved for the requested content locale).
   */
  async getBrands(localeInput?: string) {
    const locale = parseAdminContentLocale(localeInput, DEFAULT_ADMIN_CONTENT_LOCALE);
    const brands = await db.brand.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        logoUrl: true,
        translations: {
          select: { locale: true, name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      data: brands.map(
        (brand: {
          id: string;
          slug: string;
          logoUrl: string | null;
          translations?: Array<{ locale: string; name: string }>;
        }) => {
        const translations = Array.isArray(brand.translations) ? brand.translations : [];
        const translation =
          translations.find((row) => row.locale === locale) ||
          translations.find((row) => row.locale === DEFAULT_ADMIN_CONTENT_LOCALE) ||
          translations[0] ||
          null;
        const names = { hy: "", en: "", ru: "" };
        for (const row of translations) {
          if (row.locale === "hy" || row.locale === "en" || row.locale === "ru") {
            names[row.locale] = row.name;
          }
        }
        return {
          id: brand.id,
          name: translation?.name || "",
          names,
          slug: brand.slug,
          logoUrl: brand.logoUrl,
          locale,
        };
      }),
    };
  }

  /**
   * Create brand
   */
  async createBrand(data: {
    name: string;
    locale?: string;
    logoUrl?: string;
    names?: Partial<Record<"hy" | "en" | "ru", string>>;
  }) {
    const locale = parseAdminContentLocale(data.locale, DEFAULT_ADMIN_CONTENT_LOCALE);
    const namesMap: Partial<Record<"hy" | "en" | "ru", string>> = {
      ...(data.names || {}),
      [locale]: data.name,
    };
    
    // Generate base slug from name (ReDoS-safe)
    const baseSlug = toSlug(data.name);

    // Generate unique slug by appending number if needed
    let slug = baseSlug;
    let counter = 1;
    let existing = await db.brand.findUnique({
      where: { slug },
    });

    while (existing) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      existing = await db.brand.findUnique({
        where: { slug },
      });
      
      // Safety check to prevent infinite loop
      if (counter > 1000) {
        throw {
          status: 500,
          type: "https://api.shop.am/problems/internal-error",
          title: "Unable to generate unique slug",
          detail: "Could not generate a unique slug for the brand after many attempts",
        };
      }
    }

    const brand = await db.brand.create({
      data: {
        slug,
        logoUrl: data.logoUrl || undefined,
        published: true,
        translations: {
          create: (["hy", "en", "ru"] as const)
            .map((loc) => {
              const name = (namesMap[loc] || "").trim();
              if (!name) return null;
              return { locale: loc, name };
            })
            .filter((row): row is { locale: "hy" | "en" | "ru"; name: string } => row !== null),
        },
      },
      include: {
        translations: true,
      },
    });

    // Безопасное получение translation с проверкой на существование массива
    const brandTranslations = Array.isArray(brand.translations) ? brand.translations : [];
    const translation = brandTranslations.find((t: { locale: string }) => t.locale === locale) || brandTranslations[0] || null;

    await syncProductListingReadModelByBrand(brand.id);
    return {
      data: {
        id: brand.id,
        name: translation?.name || "",
        slug: brand.slug,
        logoUrl: brand.logoUrl,
      },
    };
  }

  /**
   * Update brand
   */
  async updateBrand(
    brandId: string,
    data: {
      name?: string;
      locale?: string;
      logoUrl?: string;
      names?: Partial<Record<"hy" | "en" | "ru", string>>;
    }
  ) {
    logger.info("updateBrand called", { brandId });
    
    const brand = await db.brand.findUnique({
      where: { id: brandId },
      include: {
        translations: true,
      },
    });

    if (!brand) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Brand not found",
        detail: `Brand with id '${brandId}' does not exist`,
      };
    }

    const locale = parseAdminContentLocale(data.locale, DEFAULT_ADMIN_CONTENT_LOCALE);
    const updateData: { logoUrl?: string | null } = {};

    // Update logo URL if provided
    if (data.logoUrl !== undefined) {
      updateData.logoUrl = data.logoUrl || null;
    }

    const namesToWrite: Partial<Record<"hy" | "en" | "ru", string>> = {
      ...(data.names || {}),
    };
    if (data.name !== undefined) {
      namesToWrite[locale as "hy" | "en" | "ru"] = data.name;
    }

    for (const loc of ["hy", "en", "ru"] as const) {
      const nextName = namesToWrite[loc];
      if (nextName === undefined) {
        continue;
      }
      const trimmed = nextName.trim();
      if (!trimmed) {
        continue;
      }
      await db.brandTranslation.upsert({
        where: {
          brandId_locale: {
            brandId: brand.id,
            locale: loc,
          },
        },
        create: {
          brandId: brand.id,
          locale: loc,
          name: trimmed,
        },
        update: {
          name: trimmed,
        },
      });
    }

    // Update brand base data if needed
    if (Object.keys(updateData).length > 0) {
      await db.brand.update({
        where: { id: brandId },
        data: updateData,
      });
    }

    // Fetch updated brand with translations
    const updatedBrand = await db.brand.findUnique({
      where: { id: brandId },
      include: {
        translations: {
          where: { locale },
          take: 1,
        },
      },
    });

    const brandTranslations = Array.isArray(updatedBrand?.translations) 
      ? updatedBrand.translations 
      : [];
    const translation = brandTranslations[0] || null;

    await syncProductListingReadModelByBrand(brand.id);
    return {
      data: {
        id: updatedBrand!.id,
        name: translation?.name || "",
        slug: updatedBrand!.slug,
        logoUrl: updatedBrand!.logoUrl,
      },
    };
  }

  /**
   * Delete brand (soft delete)
   */
  async deleteBrand(brandId: string) {
    logger.info('🗑️ [ADMIN SERVICE] deleteBrand called:', { value: brandId });
    
    const brand = await db.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Brand not found",
        detail: `Brand with id '${brandId}' does not exist`,
      };
    }

    // Check if brand has products (using count for better performance)
    const productsCount = await db.product.count({
      where: {
        brandId: brandId,
        deletedAt: null,
      },
    });

    if (productsCount > 0) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/bad-request",
        title: "Cannot delete brand",
        detail: `This brand has ${productsCount} associated product${productsCount > 1 ? 's' : ''}. Please remove or change brand for these products first.`,
        productsCount,
      };
    }

    await db.brand.update({
      where: { id: brandId },
      data: {
        deletedAt: new Date(),
        published: false,
      },
    });

    logger.info('✅ [ADMIN SERVICE] Brand deleted:', { value: brandId });
    await syncProductListingReadModelByBrand(brandId);
    return { success: true };
  }
}

export const adminBrandsService = new AdminBrandsService();



