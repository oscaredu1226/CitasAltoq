import { formatDateOnly, formatOffsetDateTime } from './date-only';

describe('date-only utilities', () => {
  it('formats LocalDate without timezone conversion', () => {
    expect(formatDateOnly('2026-08-28')).toBe('28/08/2026');
  });

  it('formats empty dates as dash', () => {
    expect(formatDateOnly(null)).toBe('-');
  });

  it('formats OffsetDateTime for Peru locale', () => {
    expect(formatOffsetDateTime('2026-08-28T14:30:00Z')).toContain('28/08/26');
  });
});
