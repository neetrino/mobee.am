import { createAttribute, updateAttributeTranslation } from "./admin-attributes-write/attribute-operations";
import { addAttributeValue, updateAttributeValue } from "./admin-attributes-write/value-operations";

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
    return createAttribute(data);
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
    return updateAttributeTranslation(attributeId, data);
  }

  /**
   * Add attribute value
   */
  async addAttributeValue(
    attributeId: string,
    data: { label: string; locale?: string }
  ) {
    return addAttributeValue(attributeId, data);
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
    return updateAttributeValue(attributeId, valueId, data);
  }
}

export const adminAttributesWriteService = new AdminAttributesWriteService();
