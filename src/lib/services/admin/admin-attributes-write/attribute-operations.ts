import { db } from "@white-shop/db";
import { logger } from "../../../utils/logger";
import { formatAttribute } from "./utils";

/**
 * Create attribute
 */
export async function createAttribute(data: {
  name: string;
  key: string;
  type?: string;
  filterable?: boolean;
  locale?: string;
}) {
  logger.info('Creating attribute', { key: data.key });

  // Check if attribute with this key already exists
  const existing = await db.attribute.findUnique({
    where: { key: data.key },
  });

  if (existing) {
    throw {
      status: 400,
      type: "https://api.shop.am/problems/validation-error",
      title: "Attribute already exists",
      detail: `Attribute with key '${data.key}' already exists`,
    };
  }

  const locale = data.locale || "en";

  const attribute = await db.attribute.create({
    data: {
      key: data.key,
      type: data.type || "select",
      filterable: data.filterable !== false,
      translations: {
        create: {
          locale,
          name: data.name,
        },
      },
    },
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
      },
    },
  });

  return formatAttribute(attribute, locale);
}

/**
 * Update attribute translation (name)
 */
export async function updateAttributeTranslation(
  attributeId: string,
  data: {
    name: string;
    locale?: string;
  }
) {
  logger.info('Updating attribute translation', { attributeId, name: data.name });

  const attribute = await db.attribute.findUnique({
    where: { id: attributeId },
    include: {
      translations: {
        where: { locale: data.locale || "en" },
      },
    },
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

  // Use upsert to handle both create and update cases
  await db.attributeTranslation.upsert({
    where: {
      attributeId_locale: {
        attributeId,
        locale,
      },
    },
    update: {
      name: data.name.trim(),
    },
    create: {
      attributeId,
      locale,
      name: data.name.trim(),
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




