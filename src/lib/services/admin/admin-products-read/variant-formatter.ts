/**
 * Format variant for admin product detail response
 */
export function formatVariantForAdmin(variant: {
  id: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  imageUrl: string | null;
  published: boolean | null;
  attributes: unknown;
  options?: Array<{
    attributeKey: string | null;
    value: string | null;
    valueId: string | null;
    attributeValue?: {
      value: string;
      id: string;
      attribute: {
        key: string;
      };
    } | null;
  }>;
}) {
  // Безопасное получение options с проверкой на существование массива
  const options = Array.isArray(variant.options) ? variant.options : [];
  
  // Get attributes from JSONB column if available
  let attributes: Record<string, Array<{ valueId: string; value: string; attributeKey: string }>> | null = null;
  let colorValues: string[] = [];
  let sizeValues: string[] = [];
  
  if (variant.attributes && typeof variant.attributes === 'object') {
    // attributes is already in JSONB format: { "color": [...], "size": [...] }
    const attrs = variant.attributes as Record<string, unknown>;
    attributes = attrs as Record<string, Array<{ valueId: string; value: string; attributeKey: string }>>;
    
    // Extract color and size values from JSONB attributes
    if (attrs.color && Array.isArray(attrs.color)) {
      colorValues = attrs.color.map((item: unknown) => {
        if (item && typeof item === 'object' && 'value' in item) {
          return String((item as { value: unknown }).value);
        }
        return String(item);
      }).filter(Boolean);
    }
    if (attrs.size && Array.isArray(attrs.size)) {
      sizeValues = attrs.size.map((item: unknown) => {
        if (item && typeof item === 'object' && 'value' in item) {
          return String((item as { value: unknown }).value);
        }
        return String(item);
      }).filter(Boolean);
    }
  } else if (options.length > 0) {
    // Fallback: build attributes from options if JSONB column is empty
    const attributesMap: Record<string, Array<{ valueId: string; value: string; attributeKey: string }>> = {};
    options.forEach((opt) => {
      const attrKey = opt.attributeKey || opt.attributeValue?.attribute?.key;
      const value = opt.value || opt.attributeValue?.value;
      const valueId = opt.valueId || opt.attributeValue?.id;
      
      if (attrKey && value && valueId) {
        if (!attributesMap[attrKey]) {
          attributesMap[attrKey] = [];
        }
        if (!attributesMap[attrKey].some((item) => item.valueId === valueId)) {
          attributesMap[attrKey].push({
            valueId,
            value,
            attributeKey: attrKey,
          });
        }
        
        // Extract color and size for backward compatibility
        if (attrKey === "color") {
          colorValues.push(value);
        } else if (attrKey === "size") {
          sizeValues.push(value);
        }
      }
    });
    attributes = Object.keys(attributesMap).length > 0 ? attributesMap : null;
  }
  
  // For backward compatibility: use first color/size if multiple values exist
  const colorOption = options.find((opt) => opt.attributeKey === "color");
  const sizeOption = options.find((opt) => opt.attributeKey === "size");
  
  // Use first value from arrays or fallback to single option value
  const color = colorValues.length > 0 ? colorValues[0] : (colorOption?.value || "");
  const size = sizeValues.length > 0 ? sizeValues[0] : (sizeOption?.value || "");

  return {
    id: variant.id,
    price: variant.price.toString(),
    compareAtPrice: variant.compareAtPrice?.toString() || "",
    stock: variant.stock.toString(),
    sku: variant.sku || "",
    color: color, // First color for backward compatibility
    size: size, // First size for backward compatibility
    imageUrl: variant.imageUrl || "",
    published: variant.published || false,
    attributes: attributes, // JSONB attributes with all values - IMPORTANT: This is the main field
    options: options, // Keep options for backward compatibility
    // Additional fields for new format support
    colorValues: colorValues, // All color values
    sizeValues: sizeValues, // All size values
  };
}




