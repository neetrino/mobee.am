import { describe, expect, it } from 'vitest';
import {
  getPaginationPages,
  getPaginationPagesPhoneWindow,
} from './get-pagination-pages';

describe('getPaginationPagesPhoneWindow', () => {
  it('slides three pages with next/previous navigation', () => {
    expect(getPaginationPagesPhoneWindow(20, 1)).toEqual([1, 2, 3]);
    expect(getPaginationPagesPhoneWindow(20, 2)).toEqual([2, 3, 4]);
    expect(getPaginationPagesPhoneWindow(20, 5)).toEqual([5, 6, 7]);
    expect(getPaginationPagesPhoneWindow(20, 20)).toEqual([18, 19, 20]);
  });
});

describe('getPaginationPages', () => {
  it('includes first and last with ellipses on large totals', () => {
    expect(getPaginationPages(20, 10)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
  });
});
