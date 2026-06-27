/** Armenian MobileCentre spec labels → `product.specs.labels.*` i18n paths. */
export const PRODUCT_SPEC_ARMENIAN_LABEL_KEYS: ReadonlyArray<readonly [string, string]> = [
  ['Առկա է խանութներում', 'product.specs.labels.availableInStores'],
  ['Երաշխիք', 'product.specs.labels.warranty'],
  ['Հայտարարության տարին', 'product.specs.labels.announcementYear'],
  ['Օպերացիոն համակարգ', 'product.specs.labels.operatingSystem'],
  ['Էկրանի տեսակը', 'product.specs.labels.screenType'],
  ['Էկրանի կետայնություն', 'product.specs.labels.screenResolution'],
  ['Էկրանի չափսը', 'product.specs.labels.screenSize'],
  ['Դիմային տեսախցիկ', 'product.specs.labels.frontCamera'],
  ['Հիմնական տեսախցիկ', 'product.specs.labels.mainCamera'],
  ['Ներկառուցված հիշողություն', 'product.specs.labels.builtInStorage'],
  ['Պրոցեսոր', 'product.specs.labels.processor'],
  ['SIM քարտի տեսակը', 'product.specs.labels.simCardType'],
  ['Բլութուս', 'product.specs.labels.bluetooth'],
  ['Wi-fi', 'product.specs.labels.wifi'],
  ['Wi-Fi', 'product.specs.labels.wifi'],
  ['Ակումուլատոր', 'product.specs.labels.battery'],
  ['Արագ լիցքավորում', 'product.specs.labels.fastCharging'],
  ['Արագ գազարկում', 'product.specs.labels.fastCooling'],
  ['Ջրակայուն', 'product.specs.labels.waterResistant'],
  ['Չափսը', 'product.specs.labels.dimensions'],
  ['Քաշը', 'product.specs.labels.weight'],
  ['Գույնը', 'product.specs.labels.color'],
  ['Մոդել', 'product.specs.labels.model'],
  ['Արտադրող', 'product.specs.labels.manufacturer'],
];

export const PRODUCT_SPEC_ARMENIAN_LABEL_MAP = new Map<string, string>(
  PRODUCT_SPEC_ARMENIAN_LABEL_KEYS.map(([armenian, key]) => [armenian, key]),
);

/** Tokens that are status lines, not label/value pairs. */
export const PRODUCT_SPEC_STATUS_ONLY_ARMENIAN = new Set<string>(['Առկա է խանութներում']);

/** OS names that must not appear as standalone status above the specs table. */
export const PRODUCT_SPEC_OS_STATUS_VALUES = new Set<string>([
  'ios',
  'ipados',
  'android',
  'windows',
  'macos',
  'harmonyos',
  'linux',
]);
