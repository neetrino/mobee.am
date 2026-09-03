import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  listDysonColorEntries,
  resolveDysonSwatchHexes,
} from './dyson-color-registry';

const require = createRequire(import.meta.url);
const cjsRegistry = require('../../scripts/product-import/shared/dyson-color-registry.cjs') as {
  resolveDysonColor: (raw: unknown) => {
    status: string;
    entry?: { canonicalName: string; colors: string[] };
  };
  DYSON_COLOR_ENTRIES: Array<{ canonicalName: string; aliases: string[]; colors: string[] }>;
};

describe('resolveDysonSwatchHexes', () => {
  it('resolves CMF aliases and never hue-steals pink or blue', () => {
    expect(resolveDysonSwatchHexes('Ceramic Pink')).toEqual(['#E8B4B8']);
    expect(resolveDysonSwatchHexes('Prussian Blue')).toEqual(['#003153']);
    expect(resolveDysonSwatchHexes('pink')).toEqual([]);
    expect(resolveDysonSwatchHexes('blue')).toEqual([]);
  });

  it('returns dual-tone HEX for compound finishes', () => {
    expect(resolveDysonSwatchHexes('Vinca Blue / Topaz')).toEqual(['#6B8CB4', '#D4A05A']);
    expect(resolveDysonSwatchHexes('Nickel/Copper')).toEqual(['#A8A9AD', '#B87333']);
  });

  it('stays in lockstep with the import-time CJS registry', () => {
    const tsByName = new Map(
      listDysonColorEntries().map((entry) => [entry.canonicalName, entry]),
    );
    expect(tsByName.size).toBe(cjsRegistry.DYSON_COLOR_ENTRIES.length);

    for (const entry of cjsRegistry.DYSON_COLOR_ENTRIES) {
      const tsEntry = tsByName.get(entry.canonicalName);
      expect(tsEntry?.colors).toEqual(entry.colors);
      for (const alias of [entry.canonicalName, ...entry.aliases]) {
        const cjs = cjsRegistry.resolveDysonColor(alias);
        expect(cjs.status).toBe('resolved');
        expect(resolveDysonSwatchHexes(alias)).toEqual(cjs.entry?.colors);
      }
    }
  });
});
