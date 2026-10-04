import { createAttribute, updateAttributeTranslation } from "./admin-attributes-write/attribute-operations";
import { addAttributeValue, updateAttributeValue } from "./admin-attributes-write/value-operations";
import {
  syncProductListingReadModelByAttributeId,
  syncProductListingReadModelByAttributeValueId,
} from "@/lib/read-model/product-read-model-sync";
import { invalidateProductReadCaches } from "@/lib/services/read-through-json-cache";
import { logger } from "@/lib/utils/logger";

/**
 * Keep storefront read models fresh without blocking the admin response
 * on a full catalog rebuild.
 */
function scheduleAttributeReadModelSync(
  task: () => Promise<void>,
  context: Record<string, string>,
): void {
  void task().catch((error: unknown) => {
    logger.error("Attribute read-model sync failed", {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

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
    // New attribute is unused by products yet — cache invalidation is enough.
    scheduleAttributeReadModelSync(
      () => invalidateProductReadCaches(),
      { operation: "createAttribute" },
    );
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
    scheduleAttributeReadModelSync(
      () => syncProductListingReadModelByAttributeId(attributeId),
      { operation: "updateAttributeTranslation", attributeId },
    );
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
    // New value is unused until assigned to variants.
    scheduleAttributeReadModelSync(
      () => invalidateProductReadCaches(),
      { operation: "addAttributeValue", attributeId },
    );
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
    // Color/label/image changes affect listing facets — sync only affected products.
    scheduleAttributeReadModelSync(
      () => syncProductListingReadModelByAttributeValueId(valueId),
      { operation: "updateAttributeValue", attributeId, valueId },
    );
    return result;
  }
}

export const adminAttributesWriteService = new AdminAttributesWriteService();
