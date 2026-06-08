import { db } from "@white-shop/db";
import { ensureColorsColumnsExist } from "@/lib/services/admin/admin-attributes-write/migration";

class AdminAttributesReadService {
  async getAttributes() {
    try {
      await ensureColorsColumnsExist();
    } catch (migrationError: unknown) {
      const message = migrationError instanceof Error ? migrationError.message : String(migrationError);
      console.warn('⚠️ [ADMIN ATTRIBUTES READ SERVICE] Migration check failed:', message);
    }

    let attributes;
    try {
      attributes = await db.attribute.findMany({
        include: {
          translations: {
            where: { locale: "en" },
            take: 1,
          },
          values: {
            include: {
              translations: {
                where: { locale: "en" },
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
    } catch (error: any) {
      // If attribute_values.colors column doesn't exist, fetch without it
      if (error?.code === 'P2022' || error?.message?.includes('attribute_values.colors') || error?.message?.includes('does not exist')) {
        console.warn('⚠️ [ADMIN ATTRIBUTES READ SERVICE] attribute_values.colors column not found, fetching without it:', error.message);
        // Fetch attributes first
        const attributesList = await db.attribute.findMany({
          include: {
            translations: {
              where: { locale: "en" },
              take: 1,
            },
          },
          orderBy: {
            position: "asc",
          },
        });

        // Fetch values separately without colors and imageUrl using Prisma
        // Try with select first, if it fails (because Prisma tries to select colors), use raw query
        let allValues: any[];
        try {
          allValues = await db.attributeValue.findMany({
            select: {
              id: true,
              attributeId: true,
              value: true,
              position: true,
              translations: {
                where: { locale: "en" },
                take: 1,
              },
            },
            orderBy: {
              position: "asc",
            },
          });
        } catch (selectError: any) {
          // If select also fails, use raw query with correct column name
          // Try with quoted name first, then without quotes
          console.warn('⚠️ [ADMIN ATTRIBUTES READ SERVICE] Using raw query for attribute values:', selectError.message);
          try {
            allValues = await db.$queryRaw`
              SELECT 
                av.id,
                av."attributeId",
                av.value,
                av.position
              FROM attribute_values av
              ORDER BY av.position ASC
            ` as any[];
          } catch (rawError: any) {
            // If quoted name doesn't work, try without quotes (snake_case)
            console.warn('⚠️ [ADMIN ATTRIBUTES READ SERVICE] Trying with snake_case column name:', rawError.message);
            allValues = await db.$queryRaw`
              SELECT 
                av.id,
                av.attribute_id as "attributeId",
                av.value,
                av.position
              FROM attribute_values av
              ORDER BY av.position ASC
            ` as any[];
          }
          
          // Fetch translations separately
          const valueIds = allValues.map((v: any) => v.id);
          const valueTranslations = valueIds.length > 0 
            ? await db.attributeValueTranslation.findMany({
                where: {
                  attributeValueId: { in: valueIds },
                  locale: "en",
                },
              })
            : [];
          
          // Add translations to values
          allValues = allValues.map((val: any) => ({
            ...val,
            translations: valueTranslations.filter((t: any) => t.attributeValueId === val.id),
          }));
        }

        // Combine attributes with their values
        attributes = attributesList.map((attr: any) => {
          const attrValues = allValues
            .filter((val: any) => val.attributeId === attr.id)
            .map((val: any) => {
              return {
                id: val.id,
                attributeId: val.attributeId,
                value: val.value,
                position: val.position,
                colors: null, // Add null for compatibility
                imageUrl: null, // Add null for compatibility
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

    return {
      data: attributes.map((attribute: { id: string; key: string; type: string; filterable: boolean; translations?: Array<{ name: string }>; values?: Array<{ id: string; value: string; translations?: Array<{ label: string }>; colors?: any; imageUrl?: string | null }> }) => {
        const translations = Array.isArray(attribute.translations) ? attribute.translations : [];
        const translation = translations[0] || null;
        const values = Array.isArray(attribute.values) ? attribute.values : [];
        return {
          id: attribute.id,
          key: attribute.key,
          name: translation?.name || attribute.key,
          type: attribute.type,
          filterable: attribute.filterable,
          values: values.map((value: any) => {
            const valueTranslations = Array.isArray(value.translations) ? value.translations : [];
            const valueTranslation = valueTranslations[0] || null;
            const colorsData = value.colors;
            let colorsArray: string[] = [];
            
            if (colorsData) {
              if (Array.isArray(colorsData)) {
                colorsArray = colorsData;
              } else if (typeof colorsData === 'string') {
                try {
                  colorsArray = JSON.parse(colorsData);
                } catch (e) {
                  console.warn('⚠️ [ADMIN ATTRIBUTES READ SERVICE] Failed to parse colors JSON:', e);
                  colorsArray = [];
                }
              } else if (typeof colorsData === 'object') {
                // If it's already an object (from Prisma JSONB), use it directly
                colorsArray = Array.isArray(colorsData) ? colorsData : [];
              }
            }
            
            // Ensure colorsArray is always an array of strings
            if (!Array.isArray(colorsArray)) {
              colorsArray = [];
            }
            
            console.log('🎨 [ADMIN ATTRIBUTES READ SERVICE] Parsed colors for value:', {
              valueId: value.id,
              valueLabel: valueTranslation?.label || value.value,
              colorsData,
              colorsDataType: typeof colorsData,
              colorsArray,
              colorsArrayLength: colorsArray.length
            });
            
            return {
              id: value.id,
              value: value.value,
              label: valueTranslation?.label || value.value,
              colors: colorsArray,
              imageUrl: value.imageUrl || null,
            };
          }),
        };
      }),
    };
  }
}

export const adminAttributesReadService = new AdminAttributesReadService();






