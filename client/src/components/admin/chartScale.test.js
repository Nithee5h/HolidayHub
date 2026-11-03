import { describe, expect, it } from 'vitest';
import { niceMax } from './chartScale';

describe('niceMax', () => {
  it('picks a tight, round axis maximum', () => {
    expect(niceMax(129998)).toBe(200000);
    expect(niceMax(99996)).toBe(100000);
    expect(niceMax(7)).toBe(8);
    expect(niceMax(40000)).toBe(40000);
    expect(niceMax(0)).toBe(1);
  });
});
