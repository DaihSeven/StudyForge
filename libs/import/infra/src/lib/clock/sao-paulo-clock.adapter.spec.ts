import { SaoPauloClockAdapter } from './sao-paulo-clock.adapter';

const at = (iso: string) => new SaoPauloClockAdapter(() => new Date(iso));

describe('SaoPauloClockAdapter', () => {
  it('returns the São Paulo calendar day as YYYY-MM-DD', () => {
    expect(at('2026-11-21T15:00:00Z').currentDay()).toBe('2026-11-21');
  });

  it('still reports the previous day one second before São Paulo midnight (UTC-3)', () => {
    expect(at('2026-11-22T02:59:59Z').currentDay()).toBe('2026-11-21');
  });

  it('turns the day exactly at São Paulo midnight, not at UTC midnight', () => {
    expect(at('2026-11-22T03:00:00Z').currentDay()).toBe('2026-11-22');
    expect(at('2026-11-21T23:30:00Z').currentDay()).toBe('2026-11-21');
  });

  it('uses the real clock by default', () => {
    expect(new SaoPauloClockAdapter().currentDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
