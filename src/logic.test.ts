import { describe, expect, it } from 'vitest';
import type { Data, Entry, Session } from './types';
import { compareEntries, defaultDeloadSets, deloadSetsFor, e1rm, exerciseSeries, fmtSets, lastEntryFor, sessionPRs, sessionVolume, topSet, trendChange } from './logic';
import { clock, mondayKey, parseRest, weekRange, weekdayIndex } from './dates';

const entry = (sets: [number, number, boolean?][], exerciseId = 'bench'): Entry => ({
  id: Math.random().toString(),
  exerciseId,
  reps: '6–8',
  restSec: 90,
  note: '',
  sets: sets.map(([w, r, done = true]) => ({ weight: String(w), reps: String(r), done }))
});

const session = (id: string, date: string, entries: Entry[], deload = false): Session => ({
  id,
  routineId: 'r',
  dayName: 'Push',
  date,
  status: 'done',
  deload,
  startedAt: new Date(date + 'T10:00').getTime(),
  endedAt: new Date(date + 'T11:00').getTime(),
  entries,
  note: '',
  currentIndex: 0
});

const data = (sessions: Session[]): Data => ({ version: 1, exercises: [{ id: 'bench', name: 'Bench Press' }], routines: [], activeRoutineId: null, sessions, deloadWeeks: [], bodyweight: [] });

describe('deload sets', () => {
  it('halves and rounds down, never below 1', () => {
    expect(defaultDeloadSets(4)).toBe(2);
    expect(defaultDeloadSets(3)).toBe(1);
    expect(defaultDeloadSets(2)).toBe(1);
    expect(defaultDeloadSets(1)).toBe(1);
    expect(defaultDeloadSets(5)).toBe(2);
  });
  it('uses the per-exercise override when set', () => {
    expect(deloadSetsFor({ id: 'x', exerciseId: 'b', sets: 4, reps: '8', restSec: 60, note: '', deloadSets: 3 })).toBe(3);
  });
});

describe('sets and volume', () => {
  it('only counts ticked sets with reps', () => {
    const e = entry([
      [185, 8],
      [185, 8, false],
      [185, 0]
    ]);
    expect(sessionVolume(session('a', '2026-11-16', [e]))).toBe(1480);
    expect(topSet(e)).toEqual({ w: 185, r: 8 });
  });
  it('formats same-weight sets compactly', () => {
    expect(fmtSets(entry([[190, 8], [190, 8], [190, 7]]))).toBe('190 × 8, 8, 7');
    expect(fmtSets(entry([[185, 8], [190, 6]]))).toBe('185 × 8, 190 × 6');
  });
  it('estimates 1RM with Epley', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(Math.round(e1rm(100, 10))).toBe(133);
  });
});

describe('history', () => {
  const s1 = session('s1', '2026-11-09', [entry([[185, 8], [185, 8]])]);
  const s2 = session('s2', '2026-11-16', [entry([[185, 6], [185, 6]])], true);
  const s3 = session('s3', '2026-11-23', [entry([[190, 8], [190, 7]])]);
  const d = data([s3, s1, s2]);

  it('finds the previous entry before a session', () => {
    expect(lastEntryFor(d, 'bench', s3)?.session.id).toBe('s2');
    expect(lastEntryFor(d, 'bench', s1)).toBeNull();
    expect(lastEntryFor(d, 'bench')?.session.id).toBe('s3');
  });
  it('detects PRs only when beating earlier sessions', () => {
    expect(sessionPRs(d, s3).map((p) => p.exerciseId)).toEqual(['bench']);
    expect(sessionPRs(d, s1)).toEqual([]);
    expect(sessionPRs(d, s2)).toEqual([]);
  });
  it('compares to last time', () => {
    expect(compareEntries(s3.entries[0], s1.entries[0]).text).toBe('+5 lb');
    expect(compareEntries(entry([[185, 8], [185, 9]]), s1.entries[0]).text).toBe('+1 rep');
    expect(compareEntries(s1.entries[0], null).text).toBe('First time');
  });
  it('builds a series in date order with deload flags', () => {
    const s = exerciseSeries(d, 'bench');
    expect(s.map((p) => p.date)).toEqual(['2026-11-09', '2026-11-16', '2026-11-23']);
    expect(s.map((p) => p.deload)).toEqual([false, true, false]);
  });
  it('excludes deloads from the trend', () => {
    expect(trendChange([{ v: 100, deload: false }, { v: 40, deload: true }, { v: 120, deload: false }])).toBeCloseTo(0.2);
  });
});

describe('dates', () => {
  it('uses Monday as the first day', () => {
    expect(weekdayIndex(new Date(2026, 10, 23))).toBe(0);
    expect(weekdayIndex(new Date(2026, 10, 29))).toBe(6);
    expect(mondayKey(new Date(2026, 10, 29))).toBe('2026-11-23');
  });
  it('formats', () => {
    expect(clock(((1 * 60 + 2) * 60 + 3) * 1000)).toBe('1:02:03');
    expect(weekRange('2026-11-23')).toBe('Nov 23–29');
    expect(weekRange('2026-11-30')).toBe('Nov 30–Dec 6');
    expect(parseRest('2:30')).toBe(150);
    expect(parseRest('90')).toBe(90);
    expect(parseRest('abc')).toBeNull();
  });
});
