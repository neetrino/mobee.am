import { createLucideIcon, type LucideIcon } from 'lucide-react';

/**
 * Hair dryer silhouette (lucide-compatible stroke icon).
 * Paths are optically centered in the 24×24 viewBox for circular badges.
 */
export const HairDryerIcon: LucideIcon = createLucideIcon('hair-dryer', [
  // Nozzle + rounded body
  [
    'path',
    {
      d: 'M7 5.5h7a5 5 0 1 1 0 10H10',
      key: 'body',
    },
  ],
  // Air outlet face
  ['path', { d: 'M7 5.5v10', key: 'outlet' }],
  // Handle (pistol grip)
  ['path', { d: 'M14 15.5v2a1.5 1.5 0 0 0 1.5 1.5H17', key: 'handle' }],
  // Control dial on body
  ['circle', { cx: '15.5', cy: '10.5', r: '1.5', key: 'dial' }],
  // Airflow
  ['path', { d: 'M5 7h2', key: 'air-1' }],
  ['path', { d: 'M5 10.5h2', key: 'air-2' }],
  ['path', { d: 'M5 14h2', key: 'air-3' }],
]);
