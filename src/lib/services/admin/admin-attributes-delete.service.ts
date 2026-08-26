import { db } from "@white-shop/db";
import { rebuildProductListingReadModel } from "@/lib/read-model/product-read-model-sync";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/utils/logger";

class AdminAttributesDeleteService {
  /**
   * Delete attribute
   */
  async deleteAttribute(attributeId: string) {
    try {
      logger.info('🗑️ [ADMIN ATTRIBUTES DELETE SERVICE] Սկսվում է attribute-ի հեռացում:', {
        attributeId,
        timestamp: new Date().toISOString(),
      });

      // Ստուգում ենք, արդյոք attribute-ը գոյություն ունի
      logger.info('🔍 [ADMIN ATTRIBUTES DELETE SERVICE] Ստուգվում է attribute-ի գոյությունը...');
      const attribute = await db.attribute.findUnique({
        where: { id: attributeId },
        select: {
          id: true,
          key: true,
        },
      });

      if (!attribute) {
        logger.info('❌ [ADMIN ATTRIBUTES DELETE SERVICE] Attribute-ը չի գտնվել:', { value: attributeId });
        throw {
          status: 404,
          type: "https://api.shop.am/problems/not-found",
          title: "Attribute not found",
          detail: `Attribute with id '${attributeId}' does not exist`,
        };
      }

      logger.info('✅ [ADMIN ATTRIBUTES DELETE SERVICE] Attribute-ը գտնվել է:', {
        id: attribute.id,
        key: attribute.key,
      });

      // Ստուգում ենք, արդյոք attribute-ը օգտագործվում է արտադրանքներում
      logger.info('🔍 [ADMIN ATTRIBUTES DELETE SERVICE] Ստուգվում է, արդյոք attribute-ը օգտագործվում է արտադրանքներում...');
      
      let productAttributesCount = 0;
      
      // Ստուգում ենք, արդյոք db.productAttribute գոյություն ունի
      if (db.productAttribute) {
        try {
          productAttributesCount = await db.productAttribute.count({
            where: { attributeId },
          });
          logger.info('📊 [ADMIN ATTRIBUTES DELETE SERVICE] Product attributes count:', { value: productAttributesCount });
        } catch (countError: any) {
          logger.error('❌ [ADMIN ATTRIBUTES DELETE SERVICE] Product attributes count սխալ:', {
            error: countError,
            message: countError?.message,
            code: countError?.code,
          });
          // Եթե count-ը չի աշխատում, փորձում ենք findMany-ով
          try {
            const productAttributes = await db.productAttribute.findMany({
              where: { attributeId },
              select: { id: true },
            });
            productAttributesCount = productAttributes.length;
            logger.info('📊 [ADMIN ATTRIBUTES DELETE SERVICE] Product attributes count (via findMany):', { value: productAttributesCount });
          } catch (findError: any) {
            logger.warn('⚠️ [ADMIN ATTRIBUTES DELETE SERVICE] Product attributes findMany-ը նույնպես չի աշխատում, skip անում ենք ստուգումը');
            productAttributesCount = 0;
          }
        }
      } else {
        logger.warn('⚠️ [ADMIN ATTRIBUTES DELETE SERVICE] db.productAttribute-ը undefined է, skip անում ենք product attributes ստուգումը');
      }

      if (productAttributesCount > 0) {
        logger.info('⚠️ [ADMIN ATTRIBUTES DELETE SERVICE] Attribute-ը օգտագործվում է արտադրանքներում:', { value: productAttributesCount });
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Cannot delete attribute",
          detail: `Attribute is used in ${productAttributesCount} product(s). Please remove it from products first.`,
        };
      }

      // Ստուգում ենք, արդյոք attribute values-ները օգտագործվում են variants-ներում
      logger.info('🔍 [ADMIN ATTRIBUTES DELETE SERVICE] Ստուգվում է, արդյոք attribute values-ները օգտագործվում են variants-ներում...');
      const attributeValues = await db.attributeValue.findMany({
        where: { attributeId },
        select: { id: true },
      });

      logger.info('📊 [ADMIN ATTRIBUTES DELETE SERVICE] Attribute values count:', { value: attributeValues.length });

      if (attributeValues.length > 0) {
        const valueIds = attributeValues.map((v: { id: string }) => v.id);
        logger.info('🔍 [ADMIN ATTRIBUTES DELETE SERVICE] Ստուգվում է variant options...');
        
        let variantOptionsCount = 0;
        try {
          variantOptionsCount = await db.productVariantOption.count({
            where: {
              valueId: { in: valueIds },
            },
          });
          logger.info('📊 [ADMIN ATTRIBUTES DELETE SERVICE] Variant options count:', { value: variantOptionsCount });
        } catch (countError: any) {
          logger.error('❌ [ADMIN ATTRIBUTES DELETE SERVICE] Variant options count սխալ:', {
            error: countError,
            message: countError?.message,
            code: countError?.code,
          });
          // Եթե count-ը չի աշխատում, փորձում ենք findMany-ով
          const variantOptions = await db.productVariantOption.findMany({
            where: {
              valueId: { in: valueIds },
            },
            select: { id: true },
          });
          variantOptionsCount = variantOptions.length;
          logger.info('📊 [ADMIN ATTRIBUTES DELETE SERVICE] Variant options count (via findMany):', { value: variantOptionsCount });
        }

        if (variantOptionsCount > 0) {
          logger.info('⚠️ [ADMIN ATTRIBUTES DELETE SERVICE] Attribute values-ները օգտագործվում են variants-ներում:', { value: variantOptionsCount });
          throw {
            status: 400,
            type: "https://api.shop.am/problems/validation-error",
            title: "Cannot delete attribute",
            detail: `Some attribute values are used in ${variantOptionsCount} variant(s). Please remove them from variants first.`,
          };
        }
      }

      // Հեռացնում ենք attribute-ը (values-ները կհեռացվեն cascade-ով)
      logger.info('🗑️ [ADMIN ATTRIBUTES DELETE SERVICE] Հեռացվում է attribute-ը...');
      await db.attribute.delete({
        where: { id: attributeId },
      });

      logger.info('✅ [ADMIN ATTRIBUTES DELETE SERVICE] Attribute-ը հաջողությամբ հեռացվել է:', {
        attributeId,
        timestamp: new Date().toISOString(),
      });
      
      await rebuildProductListingReadModel();
      return { success: true };
    } catch (error: unknown) {
      const err = error as { status?: number; type?: string; code?: string; name?: string };
      if (err.status && err.type) {
        logger.error("Attribute delete rejected", {
          attributeId,
          status: err.status,
          errorName: err.name,
        });
        throw error;
      }

      logger.error("Attribute delete failed", {
        attributeId,
        errorName: err.name,
        errorCode: err.code,
      });

      if (err.code === "P2025") {
        throw AppError.notFound("Attribute not found");
      }

      throw AppError.internal();
    }
  }

  /**
   * Delete attribute value
   */
  async deleteAttributeValue(attributeValueId: string) {
    try {
      logger.info('🗑️ [ADMIN ATTRIBUTES DELETE SERVICE] Deleting attribute value:', { value: attributeValueId });

      // First check if attribute value exists
      const attributeValue = await db.attributeValue.findUnique({
        where: { id: attributeValueId },
        select: {
          id: true,
          attributeId: true,
        },
      });

      if (!attributeValue) {
        throw {
          status: 404,
          type: "https://api.shop.am/problems/not-found",
          title: "Attribute value not found",
          detail: `Attribute value with id '${attributeValueId}' does not exist`,
        };
      }

      // Check if value is used in any variants
      const variantOptionsCount = await db.productVariantOption.count({
        where: {
          valueId: attributeValueId,
        },
      });

      if (variantOptionsCount > 0) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Cannot delete attribute value",
          detail: `Attribute value is used in ${variantOptionsCount} variant(s). Please remove it from variants first.`,
        };
      }

      // Delete attribute value
      await db.attributeValue.delete({
        where: { id: attributeValueId },
      });

      // Return updated attribute
      const attribute = await db.attribute.findUnique({
        where: { id: attributeValue.attributeId },
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
            orderBy: { position: "asc" },
          },
        },
      });

      if (!attribute) {
        throw AppError.internal();
      }

      const translation = attribute.translations[0];
      const values = attribute.values || [];

      await rebuildProductListingReadModel();
      return {
        id: attribute.id,
        key: attribute.key,
        name: translation?.name || attribute.key,
        type: attribute.type,
        filterable: attribute.filterable,
        values: values.map((val: any) => {
          const valTranslation = val.translations?.[0];
          return {
            id: val.id,
            value: val.value,
            label: valTranslation?.label || val.value,
          };
        }),
      };
    } catch (error: any) {
      logger.error("Attribute value delete failed", {
        errorName: error instanceof Error ? error.name : undefined,
      });
      if (error.status) {
        throw error;
      }
      throw AppError.internal();
    }
  }
}

export const adminAttributesDeleteService = new AdminAttributesDeleteService();






