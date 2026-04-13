import { db } from "@white-shop/db";
import { logger } from "../../../utils/logger";
import { ensureColorsColumnsExist } from "./migration";
import { formatAttribute, parseColors } from "./utils";

/**
 * Add attribute value
 */
export async function addAttributeValue(
  attributeId: string,
  data: { label: string; locale?: string }
) {
  logger.info('Adding attribute value', { attributeId, label: data.label });

  const attribute = await db.attribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) {
    throw {
      status: 404,
      type: "https://api.shop.am/problems/not-found",
      title: "Attribute not found",
      detail: `Attribute with id '${attributeId}' does not exist`,
    };
  }

  const locale = data.locale || "en";

  // Use label as value (normalized)
  const value = data.label.trim().toLowerCase().replace(/\s+/g, '-');

  // Check if value already exists
  const existing = await db.attributeValue.findFirst({
    where: {
      attributeId,
      value,
    },
  });

  if (existing) {
    throw {
      status: 400,
      type: "https://api.shop.am/problems/validation-error",
      title: "Value already exists",
      detail: `Value '${data.label}' already exists for this attribute`,
    };
  }

  await db.attributeValue.create({
    data: {
      attributeId,
      value,
      translations: {
        create: {
          locale,
          label: data.label.trim(),
        },
      },
    },
  });

  // Return updated attribute with all values
  const updatedAttribute = await db.attribute.findUnique({
    where: { id: attributeId },
    include: {
      translations: {
        where: { locale },
      },
      values: {
        include: {
          translations: {
            where: { locale },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!updatedAttribute) {
    throw {
      status: 500,
      type: "https://api.shop.am/problems/internal-error",
      title: "Internal Server Error",
      detail: "Failed to retrieve updated attribute",
    };
  }

  return formatAttribute(updatedAttribute, locale);
}

/**
 * Update attribute value
 */
export async function updateAttributeValue(
  attributeId: string,
  valueId: string,
  data: {
    label?: string;
    colors?: string[];
    imageUrl?: string | null;
    locale?: string;
  }
) {
  logger.info('Updating attribute value', { attributeId, valueId, data });

  // Ensure colors and imageUrl columns exist (runtime migration)
  try {
    await ensureColorsColumnsExist();
  } catch (migrationError: unknown) {
    const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
    logger.warn('Migration check failed', { error: errorMessage });
    // Continue anyway - might already exist
  }

  const attributeValue = await db.attributeValue.findUnique({
    where: { id: valueId },
    include: {
      attribute: true,
      translations: true,
    },
  });

  if (!attributeValue) {
    throw {
      status: 404,
      type: "https://api.shop.am/problems/not-found",
      title: "Attribute value not found",
      detail: `Attribute value with id '${valueId}' does not exist`,
    };
  }

  if (attributeValue.attributeId !== attributeId) {
    throw {
      status: 400,
      type: "https://api.shop.am/problems/validation-error",
      title: "Validation Error",
      detail: "Attribute value does not belong to the specified attribute",
    };
  }

  const locale = data.locale || "en";
  const updateData: {
    colors?: string[];
    imageUrl?: string | null;
  } = {};

  // Update colors if provided
  if (data.colors !== undefined) {
    // Ensure colors is always an array (even if empty)
    // Prisma JSONB field expects an array format
    updateData.colors = Array.isArray(data.colors) ? data.colors : [];
    logger.debug('Setting colors', { 
      valueId, 
      colors: updateData.colors, 
      colorsType: typeof updateData.colors,
      isArray: Array.isArray(updateData.colors)
    });
  }

  // Update imageUrl if provided
  if (data.imageUrl !== undefined) {
    updateData.imageUrl = data.imageUrl || null;
  }

  // Update translation label if provided
  if (data.label !== undefined) {
    const existingTranslation = attributeValue.translations.find(
      (t: { locale: string }) => t.locale === locale
    );

    if (existingTranslation) {
      await db.attributeValueTranslation.update({
        where: { id: existingTranslation.id },
        data: { label: data.label.trim() },
      });
    } else {
      await db.attributeValueTranslation.create({
        data: {
          attributeValueId: valueId,
          locale,
          label: data.label.trim(),
        },
      });
    }
  }

  // Update attribute value if colors or imageUrl changed
  if (Object.keys(updateData).length > 0) {
    logger.debug('Updating attribute value in database', { 
      valueId, 
      updateData,
      updateDataKeys: Object.keys(updateData)
    });
    const updatedValue = await db.attributeValue.update({
      where: { id: valueId },
      data: updateData,
    });
    logger.debug('Attribute value updated', { 
      valueId, 
      savedColors: updatedValue.colors,
      savedColorsType: typeof updatedValue.colors
    });
  }

  // Return updated attribute with all values
  const updatedAttribute = await db.attribute.findUnique({
    where: { id: attributeId },
    include: {
      translations: {
        where: { locale },
      },
      values: {
        include: {
          translations: {
            where: { locale },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!updatedAttribute) {
    throw {
      status: 500,
      type: "https://api.shop.am/problems/internal-error",
      title: "Internal Server Error",
      detail: "Failed to retrieve updated attribute",
    };
  }

  return formatAttribute(updatedAttribute, locale);
}




