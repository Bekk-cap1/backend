import { hasKey, isRecord } from './type-guards';

describe('type-guards', () => {
  it('isRecord returns true for objects', () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('isRecord returns false for null and primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(1)).toBe(false);
    expect(isRecord('x')).toBe(false);
  });

  it('hasKey returns true when key exists', () => {
    expect(hasKey({ a: 1 }, 'a')).toBe(true);
  });

  it('hasKey returns false when key missing or not record', () => {
    expect(hasKey({ a: 1 }, 'b')).toBe(false);
    expect(hasKey(null, 'a')).toBe(false);
  });
});
