import { isPrismaError } from './prisma-error';

describe('isPrismaError', () => {
  it('returns true for object with string code', () => {
    expect(isPrismaError({ code: 'P2002' })).toBe(true);
  });

  it('returns false for non-object values', () => {
    expect(isPrismaError(null)).toBe(false);
    expect(isPrismaError(123)).toBe(false);
  });

  it('returns false when code is missing or not string', () => {
    expect(isPrismaError({})).toBe(false);
    expect(isPrismaError({ code: 123 })).toBe(false);
  });
});
