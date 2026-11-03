import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext (open-redirect protection)', () => {
  it('allows in-app paths', () => {
    expect(safeNext('/packages?destination=Goa')).toBe('/packages?destination=Goa');
    expect(safeNext('/admin')).toBe('/admin');
  });
  it('rejects external, protocol-relative and auth-loop targets', () => {
    ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/login', '/register?x=1', null, undefined].forEach((n) =>
      expect(safeNext(n)).toBe('/'),
    );
  });
});
