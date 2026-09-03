import type { LucideIcon } from 'lucide-react';
import {
  Aperture,
  BadgeCheck,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  Bluetooth,
  Box,
  Calendar,
  Camera,
  CardSim,
  CircleDot,
  CircuitBoard,
  Cpu,
  Database,
  Droplets,
  Factory,
  Gauge,
  Globe2,
  HardDrive,
  Hash,
  Info,
  LayoutGrid,
  ListOrdered,
  Maximize2,
  MemoryStick,
  Monitor,
  Navigation,
  Palette,
  Plug,
  RotateCw,
  Ruler,
  Settings2,
  Shield,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  Smartphone,
  Snowflake,
  Store,
  SwitchCamera,
  Tag,
  Tv,
  Usb,
  Volume2,
  WashingMachine,
  Weight,
  Wifi,
} from 'lucide-react';
import { resolveSpecLabelKey } from '@/lib/products/product-spec-heuristics';

const LABEL_KEY_ICONS: Readonly<Record<string, LucideIcon>> = {
  'product.specs.labels.availableInStores': Store,
  'product.specs.labels.warranty': BadgeCheck,
  'product.specs.labels.announcementYear': Calendar,
  'product.specs.labels.operatingSystem': Smartphone,
  'product.specs.labels.displayType': Tv,
  'product.specs.labels.screenResolution': Maximize2,
  'product.specs.labels.screenDiagonal': Monitor,
  'product.specs.labels.frontCamera': SwitchCamera,
  'product.specs.labels.mainCamera': Aperture,
  'product.specs.labels.webcam': Camera,
  'product.specs.labels.camera': Camera,
  'product.specs.labels.builtInStorage': HardDrive,
  'product.specs.labels.ram': MemoryStick,
  'product.specs.labels.storageType': Database,
  'product.specs.labels.graphicsMemory': CircuitBoard,
  'product.specs.labels.processor': Cpu,
  'product.specs.labels.processorModel': CircuitBoard,
  'product.specs.labels.simCardType': CardSim,
  'product.specs.labels.sim': CardSim,
  'product.specs.labels.bluetooth': Bluetooth,
  'product.specs.labels.wifi': Wifi,
  'product.specs.labels.network': Signal,
  'product.specs.labels.connector': Usb,
  'product.specs.labels.gps': Navigation,
  'product.specs.labels.battery': BatteryFull,
  'product.specs.labels.batteryType': BatteryMedium,
  'product.specs.labels.batteryCapacity': Gauge,
  'product.specs.labels.charging': Plug,
  'product.specs.labels.fastCharging': BatteryCharging,
  'product.specs.labels.fastCooling': Snowflake,
  'product.specs.labels.waterResistant': Droplets,
  'product.specs.labels.dimensions': Ruler,
  'product.specs.labels.weight': Weight,
  'product.specs.labels.color': Palette,
  'product.specs.labels.model': Tag,
  'product.specs.labels.manufacturer': Factory,
  'product.specs.labels.deviceType': LayoutGrid,
  'product.specs.labels.other': Info,
};

/** Keyword → icon for Marco / unmapped appliance labels (hy / ru / en). */
const LABEL_TEXT_ICON_RULES: ReadonlyArray<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /գույն|color|цвет/i, icon: Palette },
  { pattern: /չափս|dimension|размер|հաստություն|երկարություն|լայնություն/i, icon: Ruler },
  { pattern: /քաշ|կշիռ|weight|вес/i, icon: Weight },
  { pattern: /արտադրող\s*երկիր|երկիր|country|страна/i, icon: Globe2 },
  { pattern: /արտադրող|manufacturer|производител/i, icon: Factory },
  { pattern: /ծանրաբեռն|load|загрузк/i, icon: Gauge },
  { pattern: /պտտմ|spin|отжим|պտ\/ր|об\/мин|rpm/i, icon: RotateCw },
  { pattern: /ռեժիմ|mode|программ|program/i, icon: ListOrdered },
  { pattern: /կարգավոր|control|управлен|механик|электрон/i, icon: SlidersHorizontal },
  { pattern: /լվացք|wash|стирк|washing/i, icon: WashingMachine },
  { pattern: /երաշխիք|warranty|гарант/i, icon: BadgeCheck },
  { pattern: /մարտկոց|battery|аккумулятор|ակումուլատոր/i, icon: BatteryFull },
  { pattern: /էկրան|screen|display|дисплей|экран/i, icon: Monitor },
  { pattern: /տեսախցիկ|camera|камер/i, icon: Camera },
  { pattern: /հիշողություն|memory|storage|память/i, icon: HardDrive },
  { pattern: /պրոցեսոր|processor|cpu|чип/i, icon: Cpu },
  { pattern: /wifi|wi-fi|վայ.?ֆայ/i, icon: Wifi },
  { pattern: /bluetooth|բլութուս/i, icon: Bluetooth },
  { pattern: /ձայն|бարձախոս|audio|звук|speaker/i, icon: Volume2 },
  { pattern: /մոդել|model|модель/i, icon: Tag },
  { pattern: /տեսակ|type|тип/i, icon: LayoutGrid },
  { pattern: /կապ|ցանց|network|связь/i, icon: Signal },
  { pattern: /միացք|connector|разъ[её]м|usb|hdmi/i, icon: Usb },
  { pattern: /ջրակայուն|water|влагозащит/i, icon: Droplets },
  { pattern: /տարի|year|год|հայտարար/i, icon: Calendar },
];

/** Stable varied fallbacks when no keyword / key matches. */
const FALLBACK_ROW_ICONS: readonly LucideIcon[] = [
  CircleDot,
  Hash,
  Settings2,
  Box,
  Info,
  LayoutGrid,
  Tag,
  Gauge,
];

const SECTION_ICONS: Readonly<Record<string, LucideIcon>> = {
  general: LayoutGrid,
  screen: Monitor,
  memory: HardDrive,
  processor: Cpu,
  connectivity: Wifi,
  cameras: Camera,
  power: BatteryFull,
  physical: Ruler,
  warranty: ShieldCheck,
  other: Settings2,
  security: Shield,
};

const SECTION_ICON_CLASSNAMES: Readonly<Record<string, string>> = {
  general: 'bg-blue-100 text-blue-600',
  screen: 'bg-cyan-100 text-cyan-600',
  memory: 'bg-violet-100 text-violet-600',
  processor: 'bg-indigo-100 text-indigo-600',
  connectivity: 'bg-emerald-100 text-emerald-600',
  cameras: 'bg-pink-100 text-pink-600',
  power: 'bg-amber-100 text-amber-600',
  physical: 'bg-slate-100 text-slate-600',
  warranty: 'bg-teal-100 text-teal-600',
  other: 'bg-orange-100 text-orange-600',
  security: 'bg-amber-100 text-amber-600',
};

function hashLabel(label: string): number {
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function iconFromLabelText(label: string): LucideIcon | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }

  for (const rule of LABEL_TEXT_ICON_RULES) {
    if (rule.pattern.test(trimmed)) {
      return rule.icon;
    }
  }

  return FALLBACK_ROW_ICONS[hashLabel(trimmed) % FALLBACK_ROW_ICONS.length] ?? Info;
}

export function getProductSpecSectionIconClassName(slug: string): string {
  return SECTION_ICON_CLASSNAMES[slug] ?? 'bg-gray-100 text-gray-600';
}

/**
 * Resolves a Lucide icon for a product-spec row by stable label key,
 * then by raw label keywords (Marco / appliance), then a stable hash fallback.
 */
export function getProductSpecRowIcon(labelKey?: string, label?: string): LucideIcon {
  if (labelKey && LABEL_KEY_ICONS[labelKey]) {
    return LABEL_KEY_ICONS[labelKey];
  }

  if (label) {
    const resolvedKey = resolveSpecLabelKey(label);
    if (resolvedKey && LABEL_KEY_ICONS[resolvedKey]) {
      return LABEL_KEY_ICONS[resolvedKey];
    }

    const fromText = iconFromLabelText(label);
    if (fromText) {
      return fromText;
    }
  }

  return Info;
}

export function getProductSpecSectionIcon(slug: string): LucideIcon {
  return SECTION_ICONS[slug] ?? Settings2;
}
