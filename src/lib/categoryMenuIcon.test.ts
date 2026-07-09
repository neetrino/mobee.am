import { describe, expect, it } from 'vitest';
import { Gamepad2, Headphones, Smartphone, Wind } from 'lucide-react';
import { resolveCategoryMenuIcon } from './categoryMenuIcon';

describe('resolveCategoryMenuIcon', () => {
  it('maps hair dryers to Wind', () => {
    expect(resolveCategoryMenuIcon({ title: 'Ֆեներ', slug: 'hair-dryers' })).toBe(Wind);
  });

  it('maps game consoles to Gamepad2', () => {
    expect(resolveCategoryMenuIcon({ title: 'Խաղային կոնսոլներ', slug: 'game-consoles' })).toBe(
      Gamepad2,
    );
  });

  it('maps phones by Armenian title', () => {
    expect(resolveCategoryMenuIcon({ title: 'Հեռախոս', slug: 'phones' })).toBe(Smartphone);
  });

  it('maps headphones by slug', () => {
    expect(resolveCategoryMenuIcon({ title: 'Headphones', slug: 'headphones' })).toBe(Headphones);
  });
});
