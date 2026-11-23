import { describe, expect, it } from 'vitest';
import { dailySeries, fmtDelta, parseKg, rollingAvg, weekOverWeek, weeklyAverages } from './weight';

const e = (date: string, kg: number) => ({ date, kg });

describe('body weight', () => {
  const list = [e('2026-11-16', 82), e('2026-11-17', 82.4), e('2026-11-19', 81.6), e('2026-11-22', 82), e('2026-11-23', 81.2), e('2026-11-24', 81)];

  it('averages the 7 calendar days ending on a date', () => {
    expect(rollingAvg(list, '2026-11-22')).toBeCloseTo((82 + 82.4 + 81.6 + 82) / 4);
    // window for Nov 24 is Nov 18–24
    expect(rollingAvg(list, '2026-11-24')).toBeCloseTo((81.6 + 82 + 81.2 + 81) / 4);
    expect(rollingAvg(list, '2026-11-10')).toBeNull();
  });

  it('pairs each day with its rolling average, oldest first', () => {
    const s = dailySeries([...list].reverse());
    expect(s[0]).toEqual({ date: '2026-11-16', kg: 82, avg7: 82 });
    expect(s.map((p) => p.date)).toEqual(list.map((x) => x.date));
  });

  it('builds Monday–Sunday averages with week-over-week change', () => {
    const w = weeklyAverages(list);
    expect(w[0].monday).toBe('2026-11-23');
    expect(w[0].avg).toBeCloseTo(81.1);
    expect(w[0].count).toBe(2);
    expect(w[1].avg).toBeCloseTo(82);
    expect(w[0].change).toBeCloseTo(-0.9);
    expect(w[1].change).toBeNull();
  });

  it('compares the 7-day average with a week earlier', () => {
    // Nov 17–23 average vs Nov 10–16 average
    expect(weekOverWeek(list, '2026-11-23')).toBeCloseTo((82.4 + 81.6 + 82 + 81.2) / 4 - 82);
  });

  it('parses and formats', () => {
    expect(parseKg('82,45')).toBe(82.5);
    expect(parseKg('8')).toBeNull();
    expect(fmtDelta(-0.94)).toBe('−0.9');
    expect(fmtDelta(0.02)).toBe('±0.0');
  });
});
