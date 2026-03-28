import { describe, expect, it } from 'vitest';
import {
  formatDistance,
  formatEntityLabel,
  formatEtaSeconds,
  formatRoleLabel,
  formatStatusLabel,
} from '../core/format';

describe('format helpers', () => {
  it('maps statuses to RU labels', () => {
    expect(formatStatusLabel('pending')).toBe('Ожидает');
    expect(formatStatusLabel('completed')).toBe('Завершено');
  });

  it('maps role to readable label', () => {
    expect(formatRoleLabel('driver')).toBe('Водитель');
  });

  it('formats distance and eta', () => {
    expect(formatDistance(450)).toBe('450 м');
    expect(formatDistance(2450)).toBe('2.5 км');
    expect(formatEtaSeconds(300)).toBe('5 мин');
  });

  it('creates compact entity label', () => {
    expect(formatEntityLabel('Рейс', '20fb26d3-2094-48d6-a97b-c331284a5a9f')).toBe('Рейс #20FB26D3');
  });
});
