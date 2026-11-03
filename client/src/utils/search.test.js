import { describe, expect, it } from 'vitest';
import { budgetToRange, buildSearchParams, parseSearchParams, rangeToBudget } from './search';

const parse = (qs) => parseSearchParams(new URLSearchParams(qs));

describe('parseSearchParams', () => {
  it('normalises and validates values', () => {
    const f = parse('destination=%20Kerala%20&travellers=40&minPrice=abc&maxPrice=50000&date=12-12-2026&sort=hack&theme=Tropical&duration=99');
    expect(f).toMatchObject({ destination: 'Kerala', travellers: 12, minPrice: undefined, maxPrice: 50000, date: '', sort: '', theme: 'tropical', duration: '' });
  });

  it('accepts valid dates, sorts and durations', () => {
    expect(parse('date=2026-12-20&sort=price-asc&duration=4-5')).toMatchObject({ date: '2026-12-20', sort: 'price-asc', duration: '4-5' });
  });
});

describe('buildSearchParams', () => {
  it('omits empty values and round-trips through parse', () => {
    const qs = buildSearchParams({ destination: 'Goa', category: '', minPrice: 0, maxPrice: 15000, travellers: 2 }).toString();
    expect(qs).toBe('destination=Goa&minPrice=0&maxPrice=15000&travellers=2');
    expect(parse(qs)).toMatchObject({ destination: 'Goa', minPrice: 0, maxPrice: 15000, travellers: 2 });
  });
});

describe('budget helpers', () => {
  it('maps budget options to price ranges and back', () => {
    expect(budgetToRange('15000-50000')).toEqual({ minPrice: 15000, maxPrice: 50000 });
    expect(budgetToRange('100000-')).toEqual({ minPrice: 100000, maxPrice: undefined });
    expect(budgetToRange('')).toEqual({ minPrice: undefined, maxPrice: undefined });
    expect(rangeToBudget(0, 15000)).toBe('0-15000');
    expect(rangeToBudget(100000, undefined)).toBe('100000-');
    expect(rangeToBudget(123, 456)).toBe('');
  });
});
