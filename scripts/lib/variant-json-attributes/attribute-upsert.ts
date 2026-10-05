import { db } from "@white-shop/db";
import { ADMIN_CONTENT_LOCALES } from "@/lib/admin/admin-content-locale";
import {
  attributeValueLabels,
  type VariantJsonAttributeDefinition,
} from "./definitions";

export interface ResolvedAttribute {
  id: string;
  key: string;
  /** Lower-cased value → AttributeValue id. */
  valueIds: Map<string, string>;
}

async function nextAttributePosition(): Promise<number> {
  const last = await db.attribute.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (last?.position ?? -1) + 1;
}

async function findOrCreateAttribute(
  definition: VariantJsonAttributeDefinition,
): Promise<{ id: string; created: boolean }> {
  const existing = await db.attribute.findUnique({
    where: { key: definition.key },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const created = await db.attribute.create({
    data: {
      key: definition.key,
      type: "select",
      filterable: true,
      position: await nextAttributePosition(),
      translations: {
        create: ADMIN_CONTENT_LOCALES.map((locale) => ({
          locale,
          name: definition.names[locale],
        })),
      },
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

async function createAttributeValue(
  attributeId: string,
  definition: VariantJsonAttributeDefinition,
  value: string,
  position: number,
): Promise<string> {
  const labels = attributeValueLabels(definition, value);
  const created = await db.attributeValue.create({
    data: {
      attributeId,
      value,
      position,
      translations: {
        create: ADMIN_CONTENT_LOCALES.map((locale) => ({ locale, label: labels[locale] })),
      },
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Ensure the Attribute row and every needed value exist; existing rows are reused untouched.
 */
export async function ensureAttributeWithValues(
  definition: VariantJsonAttributeDefinition,
  values: ReadonlySet<string>,
): Promise<{ attribute: ResolvedAttribute; createdAttribute: boolean; createdValues: number }> {
  const { id, created } = await findOrCreateAttribute(definition);
  const existingValues = await db.attributeValue.findMany({
    where: { attributeId: id },
    select: { id: true, value: true, position: true },
  });
  const valueIds = new Map(existingValues.map((row) => [row.value.toLowerCase(), row.id]));
  let position = existingValues.reduce((max, row) => Math.max(max, row.position), -1) + 1;
  let createdValues = 0;

  const sorted = [...values].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  for (const value of sorted) {
    if (valueIds.has(value.toLowerCase())) continue;
    valueIds.set(value.toLowerCase(), await createAttributeValue(id, definition, value, position));
    position += 1;
    createdValues += 1;
  }

  return {
    attribute: { id, key: definition.key, valueIds },
    createdAttribute: created,
    createdValues,
  };
}
