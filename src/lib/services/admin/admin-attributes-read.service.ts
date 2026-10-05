import { db } from "@white-shop/db";
import {
  DEFAULT_ADMIN_CONTENT_LOCALE,
  parseAdminContentLocale,
} from "@/lib/admin/admin-content-locale";
import { logger } from "@/lib/utils/logger";
import {
  getAttributeProductCountMap,
  getAttributeValueProductCountMap,
} from "@/lib/services/admin/attribute-value-product-counts";
import { ensureColorsColumnsExist } from "@/lib/services/admin/admin-attributes-write/migration";

class AdminAttributesReadService {
  async getAttributes(localeInput?: string) {
    const locale = parseAdminContentLocale(localeInput, DEFAULT_ADMIN_CONTENT_LOCALE);

    try {
      await ensureColorsColumnsExist();
    } catch {
      logger.warn("Attributes migration check failed");
    }

    let attributes;
    try {
      attributes = await db.attribute.findMany({
        include: {
          translations: {
            where: { locale },
            take: 1,
          },
          values: {
            include: {
              translations: {
                where: { locale },
                take: 1,
              },
            },
            orderBy: {
              position: "asc",
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      });
    } catch (error: unknown) {
      const errorObj = error as { code?: string; message?: string };
      // If attribute_values.colors column doesn't exist, fetch without it
      if (errorObj?.code === 'P2022' || errorObj?.message?.includes('attribute_values.colors') || errorObj?.message?.includes('does not exist')) {
        logger.warn("attribute_values.colors column not found; fetching without it");
        // Fetch attributes first
        const attributesList = await db.attribute.findMany({
          include: {
            translations: {
              where: { locale },
              take: 1,
            },
          },
          orderBy: {
            position: "asc",
          },
        });

        // Fetch values separately without colors and imageUrl using Prisma
        // Try with select first, if it fails (because Prisma tries to select colors), use raw query
        let allValues: Array<{
          id: string;
          attributeId: string;
          value: string;
          position: number;
          translations?: Array<{ label: string; attributeValueId?: string }>;
        }>;
        try {
          allValues = await db.attributeValue.findMany({
            select: {
              id: true,
              attributeId: true,
              value: true,
              position: true,
              translations: {
                where: { locale },
                take: 1,
              },
            },
            orderBy: {
              position: "asc",
            },
          });
        } catch {
          // If select also fails, use raw query with correct column name
          // Try with quoted name first, then without quotes
          logger.warn("Using raw query for attribute values");
          try {
            allValues = await db.$queryRaw`
              SELECT 
                av.id,
                av."attributeId",
                av.value,
                av.position
              FROM attribute_values av
              ORDER BY av.position ASC
            ` as Array<{
              id: string;
              attributeId: string;
              value: string;
              position: number;
            }>;
          } catch {
            // If quoted name doesn't work, try without quotes (snake_case)
            logger.warn("Retrying attribute values with snake_case column name");
            allValues = await db.$queryRaw`
              SELECT 
                av.id,
                av.attribute_id as "attributeId",
                av.value,
                av.position
              FROM attribute_values av
              ORDER BY av.position ASC
            ` as Array<{
              id: string;
              attributeId: string;
              value: string;
              position: number;
            }>;
          }
          
          // Fetch translations separately
          const valueIds = allValues.map((v) => v.id);
          const valueTranslations = valueIds.length > 0 
            ? await db.attributeValueTranslation.findMany({
                where: {
                  attributeValueId: { in: valueIds },
                  locale,
                },
              })
            : [];
          
          // Add translations to values
          allValues = allValues.map((val) => ({
            ...val,
            translations: valueTranslations.filter((t) => t.attributeValueId === val.id),
          }));
        }

        // Combine attributes with their values
        attributes = attributesList.map((attr) => {
          const attrValues = allValues
            .filter((val) => val.attributeId === attr.id)
            .map((val) => {
              return {
                id: val.id,
                attributeId: val.attributeId,
                value: val.value,
                position: val.position,
                colors: null,
                imageUrl: null,
                translations: Array.isArray(val.translations) ? val.translations : [],
              };
            });
          
          return {
            ...attr,
            values: attrValues,
          };
        });
      } else {
        throw error;
      }
    }

    const attributeList = Array.isArray(attributes) ? attributes : [];
    const attributeIds = attributeList.map((attribute: { id: string }) => attribute.id);
    const valueIds = attributeList.flatMap(
      (attribute: { values?: Array<{ id: string }> }) =>
        (Array.isArray(attribute.values) ? attribute.values : []).map((value) => value.id),
    );

    const [valueProductCounts, attributeProductCounts] = await Promise.all([
      getAttributeValueProductCountMap(valueIds),
      getAttributeProductCountMap(attributeIds),
    ]);

    return {
      data: attributeList.map((attribute: {
        id: string;
        key: string;
        type: string;
        filterable: boolean;
        translations?: Array<{ name: string }>;
        values?: Array<{
          id: string;
          value: string;
          translations?: Array<{ label: string }>;
          colors?: unknown;
          imageUrl?: string | null;
        }>;
      }) => {
        const translations = Array.isArray(attribute.translations) ? attribute.translations : [];
        const translation = translations[0] || null;
        const values = Array.isArray(attribute.values) ? attribute.values : [];
        return {
          id: attribute.id,
          key: attribute.key,
          name: translation?.name || attribute.key,
          type: attribute.type,
          filterable: attribute.filterable,
          productCount: attributeProductCounts.get(attribute.id) ?? 0,
          locale,
          values: values.map((value) => {
            const valueTranslations = Array.isArray(value.translations) ? value.translations : [];
            const valueTranslation = valueTranslations[0] || null;
            const colorsData = value.colors;
            let colorsArray: string[] = [];

            if (colorsData) {
              if (Array.isArray(colorsData)) {
                colorsArray = colorsData as string[];
              } else if (typeof colorsData === "string") {
                try {
                  colorsArray = JSON.parse(colorsData);
                } catch {
                  logger.warn("Failed to parse attribute colors JSON");
                  colorsArray = [];
                }
              } else if (typeof colorsData === "object") {
                colorsArray = Array.isArray(colorsData) ? (colorsData as string[]) : [];
              }
            }

            if (!Array.isArray(colorsArray)) {
              colorsArray = [];
            }

            return {
              id: value.id,
              value: value.value,
              label: valueTranslation?.label || value.value,
              colors: colorsArray,
              imageUrl: value.imageUrl || null,
              productCount: valueProductCounts.get(value.id) ?? 0,
            };
          }),
        };
      }),
    };
  }
}

export const adminAttributesReadService = new AdminAttributesReadService();






