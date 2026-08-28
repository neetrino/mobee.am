import type { LucideIcon } from 'lucide-react';
import {
  Aperture,
  BadgeCheck,
  BatteryFull,
  BatteryCharging,
  Bluetooth,
  Box,
  Calendar,
  Camera,
  CardSim,
  CircuitBoard,
  Droplets,
  Factory,
  HardDrive,
  Info,
  LayoutGrid,
  MemoryStick,
  Monitor,
  Navigation,
  Palette,
  Plug,
  Shield,
  ShieldCheck,
  Signal,
  Smartphone,
  Snowflake,
  Store,
  SwitchCamera,
  Tag,
  Usb,
  Weight,
  Wifi,
} from 'lucide-react';
import { resolveSpecLabelKey } from '@/lib/products/product-spec-heuristics';

const LABEL_KEY_ICONS: Readonly<Record<string, LucideIcon>> = {
  'product.specs.labels.availableInStores': Store,
  'product.specs.labels.warranty': BadgeCheck,
  'product.specs.labels.announcementYear': Calendar,
  'product.specs.labels.operatingSystem': Smartphone,
  'product.specs.labels.displayType': Monitor,
  'product.specs.labels.screenResolution': Monitor,
  'product.specs.labels.screenDiagonal': Monitor,
  'product.specs.labels.frontCamera': SwitchCamera,
  'product.specs.labels.mainCamera': Aperture,
  'product.specs.labels.webcam': Camera,
  'product.specs.labels.camera': Camera,
  'product.specs.labels.builtInStorage': HardDrive,
  'product.specs.labels.ram': MemoryStick,
  'product.specs.labels.storageType': HardDrive,
  'product.specs.labels.graphicsMemory': CircuitBoard,
  'product.specs.labels.processor': CircuitBoard,
  'product.specs.labels.processorModel': CircuitBoard,
  'product.specs.labels.simCardType': CardSim,
  'product.specs.labels.sim': CardSim,
  'product.specs.labels.bluetooth': Bluetooth,
  'product.specs.labels.wifi': Wifi,
  'product.specs.labels.network': Signal,
  'product.specs.labels.connector': Usb,
  'product.specs.labels.gps': Navigation,
  'product.specs.labels.battery': BatteryFull,
  'product.specs.labels.batteryType': BatteryFull,
  'product.specs.labels.batteryCapacity': BatteryFull,
  'product.specs.labels.charging': Plug,
  'product.specs.labels.fastCharging': BatteryCharging,
  'product.specs.labels.fastCooling': Snowflake,
  'product.specs.labels.waterResistant': Droplets,
  'product.specs.labels.dimensions': Box,
  'product.specs.labels.weight': Weight,
  'product.specs.labels.color': Palette,
  'product.specs.labels.model': Tag,
  'product.specs.labels.manufacturer': Factory,
  'product.specs.labels.deviceType': LayoutGrid,
  'product.specs.labels.other': Info,
};

const SECTION_ICONS: Readonly<Record<string, LucideIcon>> = {
  /** Neutral fallback — phones get Smartphone via category icon on the hero card. */
  general: LayoutGrid,
  screen: Monitor,
  memory: HardDrive,
  processor: CircuitBoard,
  connectivity: Wifi,
  cameras: Camera,
  power: BatteryFull,
  physical: Box,
  warranty: ShieldCheck,
  other: Info,
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

export function getProductSpecSectionIconClassName(slug: string): string {
  return SECTION_ICON_CLASSNAMES[slug] ?? 'bg-gray-100 text-gray-600';
}

/**
 * Resolves a Lucide icon for a product-spec row by stable label key,
 * then by raw label text when the key is missing.
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
  }

  return Info;
}

export function getProductSpecSectionIcon(slug: string): LucideIcon {
  return SECTION_ICONS[slug] ?? Shield;
}
