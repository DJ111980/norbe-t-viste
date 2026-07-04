import { describe, expect, it } from 'vitest';
import { getBusinessDateCompact, getBusinessDateTime } from './business-time';

describe('business time', () => {
  it('formatea fecha y hora local del negocio en America/Bogota', () => {
    const date = new Date('2026-07-04T20:30:15.000Z');

    expect(getBusinessDateTime(date)).toBe('2026-07-04T15:30:15-05:00');
    expect(getBusinessDateCompact(date)).toBe('20260704');
  });
});
