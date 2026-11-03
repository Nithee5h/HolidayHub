import { describe, expect, it } from 'vitest';
import { isBookable, nextBookable, seatsLabel, unitPrice } from './departures';

const TODAY = '2026-11-01';
const dep = (over) => ({ id: 'x', startDate: '2026-12-01', status: 'open', seatsRemaining: 5, ...over });

describe('departure rules (client-side UI checks)', () => {
  it('only open, future departures with enough seats are bookable', () => {
    expect(isBookable(dep(), 5, TODAY)).toBe(true);
    expect(isBookable(dep(), 6, TODAY)).toBe(false);
    expect(isBookable(dep({ status: 'closed' }), 1, TODAY)).toBe(false);
    expect(isBookable(dep({ startDate: TODAY }), 1, TODAY)).toBe(false);
    expect(isBookable(dep({ seatsRemaining: 0 }), 1, TODAY)).toBe(false);
  });

  it('nextBookable skips sold-out and too-small departures', () => {
    const list = [dep({ id: 'a', startDate: '2026-11-05', seatsRemaining: 0 }), dep({ id: 'b', startDate: '2026-11-10', seatsRemaining: 2 }), dep({ id: 'c', startDate: '2026-12-10', seatsRemaining: 9 })];
    expect(nextBookable(list, 1, TODAY).id).toBe('b');
    expect(nextBookable(list, 3, TODAY).id).toBe('c');
    expect(nextBookable(list, 10, TODAY)).toBeUndefined();
  });

  it('uses departure-specific prices when present', () => {
    expect(unitPrice({ basePrice: 100 }, dep({ pricePerPerson: 120 }))).toBe(120);
    expect(unitPrice({ basePrice: 100 }, dep())).toBe(100);
    expect(unitPrice({ basePrice: 100 }, null)).toBe(100);
  });

  it('labels seats for the UI', () => {
    expect(seatsLabel(dep({ seatsRemaining: 0 }))).toBe('Sold out');
    expect(seatsLabel(dep({ seatsRemaining: 1 }))).toBe('Last seat');
    expect(seatsLabel(dep({ seatsRemaining: 3 }))).toBe('Only 3 left');
    expect(seatsLabel(dep({ seatsRemaining: 12 }))).toBe('12 seats left');
  });
});
