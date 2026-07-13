import type { LucideIcon } from 'lucide-react';
import {
  Bluetooth,
  Camera,
  Cpu,
  HardDrive,
  Monitor,
  Shield,
  Smartphone,
  Wifi,
} from 'lucide-react';

const LABEL_KEY_ICONS: Readonly<Record<string, LucideIcon>> = {
  'product.specs.labels.operatingSystem': Cpu,
  'product.specs.labels.deviceType': Smartphone,
  'product.specs.labels.screenDiagonal': Monitor,
  'product.specs.labels.screenResolution': Monitor,
  'product.specs.labels.displayType': Monitor,
  'product.specs.labels.builtInStorage': HardDrive,
  'product.specs.labels.ram': HardDrive,
  'product.specs.labels.storageType': HardDrive,
  'product.specs.labels.graphicsMemory': HardDrive,
  'product.specs.labels.processor': Cpu,
  'product.specs.labels.processorModel': Cpu,
  'product.specs.labels.bluetooth': Bluetooth,
  'product.specs.labels.wifi': Wifi,
  'product.specs.labels.webcam': Camera,
  'product.specs.labels.network': Wifi,
  'product.specs.labels.simCardType': Smartphone,
  'product.specs.labels.sim': Smartphone,
};

const SECTION_ICONS: Readonly<Record<string, LucideIcon>> = {
  general: Cpu,
  screen: Monitor,
  memory: HardDrive,
  processor: Cpu,
  connectivity: Wifi,
  cameras: Camera,
  power: Cpu,
  physical: Smartphone,
  warranty: Shield,
  other: Shield,
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

export function getProductSpecRowIcon(labelKey?: string): LucideIcon {
  if (labelKey && LABEL_KEY_ICONS[labelKey]) {
    return LABEL_KEY_ICONS[labelKey];
  }
  return Cpu;
}

export function getProductSpecSectionIcon(slug: string): LucideIcon {
  return SECTION_ICONS[slug] ?? Shield;
}
