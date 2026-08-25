import { createAttribute, updateAttributeTranslation } from "./admin-attributes-write/attribute-operations";
import { addAttributeValue, updateAttributeValue } from "./admin-attributes-write/value-operations";
import { invalidateCatalogCaches } from "@/lib/catalog/invalidate-catalog-cache";

/**
 * Service for admin attribute write operations
 */
class AdminAttributesWriteService {
  /**
   * Create attribute
   */
  async createAttribute(data: {
    name: string;
    key: string;
    type?: string;
    filterable?: boolean;
    locale?: string;
  }) {
    const result = await createAttribute(data);
    await invalidateCatalogCaches();
    return result;
  }

  /**
   * Update attribute translation (name)
   */
  async updateAttributeTranslation(
    attributeId: string,
    data: {
      name: string;
      locale?: string;
    }
  ) {
    const result = await updateAttributeTranslation(attributeId, data);
    await invalidateCatalogCaches();
    return result;
  }

  /**
   * Add attribute value
   */
  async addAttributeValue(
    attributeId: string,
    data: { label: string; locale?: string }
  ) {
    const result = await addAttributeValue(attributeId, data);
    await invalidateCatalogCaches();
    return result;
  }

  /**
   * Update attribute value
   */
  async updateAttributeValue(
    attributeId: string,
    valueId: string,
    data: {
      label?: string;
      colors?: string[];
      imageUrl?: string | null;
      locale?: string;
    }
  ) {
    const result = await updateAttributeValue(attributeId, valueId, data);
    await invalidateCatalogCaches();
    return result;
  }
}

export const adminAttributesWriteService = new AdminAttributesWriteService();
