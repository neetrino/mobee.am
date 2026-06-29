/** Semantic value categories used for pair validation and recovery. */
export type SpecValueKind =
  | 'device_type'
  | 'storage_capacity'
  | 'storage_type'
  | 'ram'
  | 'graphics_memory'
  | 'operating_system'
  | 'display_type'
  | 'yes_no'
  | 'screen_size'
  | 'screen_resolution'
  | 'processor'
  | 'warranty'
  | 'color'
  | 'dimensions'
  | 'weight'
  | 'connectivity'
  | 'unknown';

export interface SpecValueContext {
  rawLabel?: string;
}

const DEVICE_TYPE_VALUES = new Set([
  'notebook',
  'laptop',
  'ultrabook',
  'tablet',
  'smartphone',
  'monitor',
  'desktop',
  'all-in-one',
  'all in one',
  'macbook',
  'ноутбук',
  'նոութբուք',
]);

const STORAGE_TYPE_VALUES = new Set(['ssd', 'hdd', 'nvme', 'emmc', 'ufs']);

const OS_VALUES = new Set([
  'macos',
  'ios',
  'ipados',
  'windows',
  'android',
  'linux',
  'harmonyos',
  'chrome os',
]);

const DISPLAY_TYPE_VALUES = new Set([
  'oled',
  'ips',
  'lcd',
  'amoled',
  'super amoled',
  'mini-led',
  'retina',
  'ltpo super retina',
]);

const YES_NO_VALUES = new Set(['այո', 'ոչ', 'yes', 'no', 'да', 'нет']);

const SCREEN_SIZE_PATTERN =
  /^\d+(\.\d+)?\s*(inch|inches|in)\b(\s*\([\d.]+\s*cm\))?/i;
const RESOLUTION_PATTERN = /^\d+\s*(x|×|\*|-by-)\s*\d+/i;
const WARRANTY_PATTERN = /^\d+\s*(months?|years?)\b/i;
const STORAGE_CAPACITY_TB_PATTERN = /^\d+\s*TB\b/i;
const GB_VALUE_PATTERN = /^(\d+)\s*GB\b/i;

const RAM_LABEL_PATTERN =
  /\u0555\u057a\u0565\u0580\u0561\u057f\u056b\u057e|operativ|\u043e\u043f\u0435\u0440\u0430\u0442\u0438\u0432|\bram\b|\u0563\u0580\u0561\u0566\u056b\u056f/i;
const STORAGE_LABEL_PATTERN =
  /\u0576\u0565\u0580\u056f\u0561\u0580\u0578\u0582\u0569|\u056f\u0578\u0577\u057f|built.?in|\u043d\u0430\u043a\u043e\u043f\u0438\u0442|storage|capacity|hard\s*disk|ssd|hdd|\u056f\u0578\u0577\u057f\s*\u057d\u056f/i;
const GRAPHICS_MEMORY_LABEL_PATTERN = /graphics|\u0563\u0580\u0561\u0566\u056b\u056f/i;
const SCREEN_LABEL_PATTERN =
  /ekran|screen|display|\u044D\u043A\u0440\u0430\u043D|\u0434\u0438\u0441\u043F\u043B\u0435\u0439|\u056C\u0578\u0582\u0569\u0561\u0575\u0576|\u0561\u0576\u056F\u0575\u0578\u0582\u0576|resolution/i;

const PROCESSOR_VALUE_PATTERN =
  /\b(GHz|CPU|GPU|core\s+graphics|Hexa-core|Octa-core|Deca-core|Apple\s+[AM]\d|Snapdragon|MediaTek|Dimensity|Ryzen|Core\s+i\d)\b/i;

function looksLikeProcessorValue(trimmed: string): boolean {
  if (PROCESSOR_VALUE_PATTERN.test(trimmed)) {
    return true;
  }
  if (/^\d+x[\d.]+\s*GHz/i.test(trimmed)) {
    return true;
  }
  return false;
}

function classifyGbValue(trimmed: string, context?: SpecValueContext): SpecValueKind {
  const match = trimmed.match(GB_VALUE_PATTERN);
  if (!match) {
    return 'storage_capacity';
  }

  const gigabytes = Number.parseInt(match[1], 10);
  const rawLabel = context?.rawLabel ?? '';
  const hasRamLabel = RAM_LABEL_PATTERN.test(rawLabel);
  const hasGraphicsLabel = GRAPHICS_MEMORY_LABEL_PATTERN.test(rawLabel);
  const hasStorageLabel = !hasRamLabel && !hasGraphicsLabel && STORAGE_LABEL_PATTERN.test(rawLabel);

  if (hasGraphicsLabel) {
    return 'graphics_memory';
  }

  if (hasStorageLabel) {
    return 'storage_capacity';
  }

  if (gigabytes >= 256) {
    return 'storage_capacity';
  }

  if (hasRamLabel) {
    return 'ram';
  }

  if (gigabytes <= 128) {
    return 'ram';
  }

  return 'storage_capacity';
}

export function classifySpecValue(value: string, context?: SpecValueContext): SpecValueKind {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'unknown';
  }

  const lower = trimmed.toLowerCase();
  const rawLabel = context?.rawLabel ?? '';

  if (DEVICE_TYPE_VALUES.has(lower)) {
    return 'device_type';
  }
  if (STORAGE_TYPE_VALUES.has(lower)) {
    return 'storage_type';
  }
  if (OS_VALUES.has(lower)) {
    return 'operating_system';
  }
  if (DISPLAY_TYPE_VALUES.has(lower)) {
    return 'display_type';
  }
  if (YES_NO_VALUES.has(lower)) {
    return 'yes_no';
  }
  if (WARRANTY_PATTERN.test(trimmed)) {
    return 'warranty';
  }

  if (looksLikeProcessorValue(trimmed)) {
    return 'processor';
  }

  if (SCREEN_LABEL_PATTERN.test(rawLabel) && SCREEN_SIZE_PATTERN.test(trimmed)) {
    return 'screen_size';
  }
  if (SCREEN_SIZE_PATTERN.test(trimmed)) {
    return 'screen_size';
  }
  if (RESOLUTION_PATTERN.test(trimmed)) {
    return 'screen_resolution';
  }
  if (STORAGE_CAPACITY_TB_PATTERN.test(trimmed)) {
    return 'storage_capacity';
  }
  if (GB_VALUE_PATTERN.test(trimmed)) {
    return classifyGbValue(trimmed, context);
  }

  return 'unknown';
}

/** i18n label keys that accept each value kind. */
const LABEL_KEY_VALUE_KINDS: Readonly<Record<string, readonly SpecValueKind[]>> = {
  'product.specs.labels.deviceType': ['device_type'],
  'product.specs.labels.builtInStorage': ['storage_capacity'],
  'product.specs.labels.storageType': ['storage_type'],
  'product.specs.labels.ram': ['ram'],
  'product.specs.labels.graphicsMemory': ['ram', 'graphics_memory'],
  'product.specs.labels.operatingSystem': ['operating_system'],
  'product.specs.labels.displayType': ['display_type'],
  'product.specs.labels.screenDiagonal': ['screen_size'],
  'product.specs.labels.screenResolution': ['screen_resolution'],
  'product.specs.labels.bluetooth': ['yes_no', 'connectivity'],
  'product.specs.labels.wifi': ['yes_no', 'connectivity'],
  'product.specs.labels.webcam': ['yes_no'],
  'product.specs.labels.warranty': ['warranty'],
  'product.specs.labels.color': ['color', 'unknown'],
  'product.specs.labels.dimensions': ['dimensions', 'unknown'],
  'product.specs.labels.weight': ['weight', 'unknown'],
  'product.specs.labels.processor': ['processor', 'unknown'],
  'product.specs.labels.processorModel': ['processor', 'unknown'],
  'product.specs.labels.model': ['unknown'],
  'product.specs.labels.announcementYear': ['unknown'],
  'product.specs.labels.other': ['unknown'],
};

const VALUE_KIND_TO_LABEL_KEY: Readonly<Partial<Record<SpecValueKind, string>>> = {
  device_type: 'product.specs.labels.deviceType',
  storage_capacity: 'product.specs.labels.builtInStorage',
  storage_type: 'product.specs.labels.storageType',
  ram: 'product.specs.labels.ram',
  operating_system: 'product.specs.labels.operatingSystem',
  display_type: 'product.specs.labels.displayType',
  screen_size: 'product.specs.labels.screenDiagonal',
  screen_resolution: 'product.specs.labels.screenResolution',
  yes_no: 'product.specs.labels.other',
  warranty: 'product.specs.labels.warranty',
  processor: 'product.specs.labels.processor',
  graphics_memory: 'product.specs.labels.graphicsMemory',
};

export function isCompatibleSpecPair(
  labelKey: string,
  value: string,
  context?: SpecValueContext,
): boolean {
  const allowed = LABEL_KEY_VALUE_KINDS[labelKey];
  if (!allowed) {
    return true;
  }

  const kind = classifySpecValue(value, context);
  if (kind === 'unknown') {
    return true;
  }

  return allowed.includes(kind);
}

export function recoverLabelKeyForValue(value: string, context?: SpecValueContext): string | undefined {
  const kind = classifySpecValue(value, context);
  if (kind === 'unknown' || kind === 'yes_no') {
    return undefined;
  }

  return VALUE_KIND_TO_LABEL_KEY[kind];
}

export function resolveGenericLabelKeyByValue(
  label: string,
  value: string,
  context?: SpecValueContext,
): string | undefined {
  const normalized = label.trim().toLowerCase();
  const valueKind = classifySpecValue(value, { rawLabel: label, ...context });

  if (
    normalized === 'storage' ||
    normalized === 'հիշողություն' ||
    normalized === 'память'
  ) {
    if (valueKind === 'storage_type') {
      return 'product.specs.labels.storageType';
    }
    if (valueKind === 'storage_capacity') {
      return 'product.specs.labels.builtInStorage';
    }
    if (valueKind === 'ram') {
      return 'product.specs.labels.ram';
    }
    if (valueKind === 'device_type') {
      return 'product.specs.labels.deviceType';
    }
    return undefined;
  }

  if (normalized === 'memory') {
    if (valueKind === 'ram') {
      return 'product.specs.labels.ram';
    }
    if (valueKind === 'storage_capacity') {
      return 'product.specs.labels.builtInStorage';
    }
    return undefined;
  }

  if (normalized === 'type' || normalized === 'տեսակ') {
    if (valueKind === 'device_type') {
      return 'product.specs.labels.deviceType';
    }
    if (valueKind === 'storage_type') {
      return 'product.specs.labels.storageType';
    }
    if (valueKind === 'display_type') {
      return 'product.specs.labels.displayType';
    }
    return undefined;
  }

  if (
    normalized === 'screen' ||
    normalized === 'display' ||
    normalized === 'экран' ||
    normalized === 'дисплей' ||
    normalized === 'էկրան'
  ) {
    if (valueKind === 'screen_size') {
      return 'product.specs.labels.screenDiagonal';
    }
    if (valueKind === 'screen_resolution') {
      return 'product.specs.labels.screenResolution';
    }
    if (valueKind === 'display_type') {
      return 'product.specs.labels.displayType';
    }
    return undefined;
  }

  if (normalized === 'other' || normalized === 'այլ' || normalized === 'другое') {
    const recovered = recoverLabelKeyForValue(value, context);
    if (recovered && recovered !== 'product.specs.labels.other') {
      return recovered;
    }
    return undefined;
  }

  return undefined;
}
