import { describe, expect, it } from 'vitest';
import {
  isLocaleSwitchNoop,
  shouldCorrectStaleLocaleNavigation,
} from './locale-switch-race';

describe('locale switch race', () => {
  it('treats the same URL locale with no in-flight request as a noop', () => {
    expect(isLocaleSwitchNoop('hy', 'hy', null)).toBe(true);
    expect(isLocaleSwitchNoop('hy', 'ru', null)).toBe(false);
  });

  it('treats a repeat click on the already requested locale as a noop', () => {
    expect(isLocaleSwitchNoop('hy', 'ru', 'ru')).toBe(true);
  });

  it('lets the latest choice win over a stale committed navigation', () => {
    expect(shouldCorrectStaleLocaleNavigation('ru', 'en', 'ru')).toBe(true);
    expect(shouldCorrectStaleLocaleNavigation('en', 'en', 'en')).toBe(false);
    expect(shouldCorrectStaleLocaleNavigation('ru', 'en', 'en')).toBe(false);
    expect(shouldCorrectStaleLocaleNavigation('hy', null, null)).toBe(false);
  });
});
