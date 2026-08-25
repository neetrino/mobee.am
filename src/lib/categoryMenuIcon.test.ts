import { describe, expect, it } from 'vitest';
import {
  AirVent,
  Cable,
  Gamepad2,
  Headphones,
  Laptop,
  Microwave,
  Refrigerator,
  Smartphone,
  Tablet,
  Tv,
  WandSparkles,
  WashingMachine,
  Watch,
  Wind,
} from 'lucide-react';
import { resolveCategoryMenuIcon } from './categoryMenuIcon';

describe('resolveCategoryMenuIcon', () => {
  it('maps real storefront categories to matching Lucide icons', () => {
    const cases = [
      { title: 'Խաղային կոնսոլ', slug: 'game-console', icon: Gamepad2 },
      { title: 'Հեռախոս', slug: 'heraxos', icon: Smartphone },
      { title: 'Համակարգիչ', slug: 'hamakargich', icon: Laptop },
      { title: 'Պլանշետ', slug: 'planshet', fullPath: 'tablets', icon: Tablet },
      { title: 'Վարսահարդարիչ', slug: 'varsahardarich', icon: Wind },
      { title: 'Ֆեն', slug: 'hair-dryer', icon: Wind },
      { title: 'Մազերի ուղղիչ', slug: 'hair-straightener', icon: WandSparkles },
      { title: 'Հեռուստացույց', slug: 'herustacuyc', icon: Tv },
      { title: 'Օդորակիչ', slug: 'ac', icon: AirVent },
      { title: 'Լվացքի մեքենա', slug: 'lvacqi-meqena', icon: WashingMachine },
      { title: 'Սառնարան', slug: 'sarnaran', icon: Refrigerator },
      { title: 'Ժամացույց', slug: 'jamacuyc', icon: Watch },
      { title: 'Ականջակալ', slug: 'akanjakal', icon: Headphones },
      { title: 'Աքսեսուար', slug: 'aksesuar', icon: Cable },
      { title: 'Կենցաղային տեխնիկա', slug: '', icon: Microwave },
    ] as const;

    for (const item of cases) {
      expect(
        resolveCategoryMenuIcon({
          title: item.title,
          slug: item.slug,
          fullPath: 'fullPath' in item ? item.fullPath : item.slug,
        }),
      ).toBe(item.icon);
    }
  });

  it('does not treat computer slugs as air conditioners', () => {
    expect(resolveCategoryMenuIcon({ title: 'MacBook', slug: 'macbook' })).toBe(Laptop);
  });
});
