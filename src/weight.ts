import type { WeightEntry } from './types';
import { addDays, dateKey, mondayKey, parseKey } from './dates';

export function sortedEntries(list: WeightEntry[]): WeightEntry[] {
  return [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Average of every entry in the 7 calendar days ending on `key` (inclusive). Null if none. */
export function rollingAvg(sorted: WeightEntry[], key: string, days = 7): number | null {
  const start = dateKey(addDays(parseKey(key), -(days - 1)));
  let sum = 0;
  let n = 0;
  for (const e of sorted) {
    if (e.date < start) continue;
    if (e.date > key) break;
    sum += e.kg;
    n++;
  }
  return n ? sum / n : null;
}

export interface DayPoint {
  date: string;
  kg: number;
  avg7: number;
}

/** Each logged day with its 7-day rolling average. */
export function dailySeries(list: WeightEntry[]): DayPoint[] {
  const s = sortedEntries(list);
  return s.map((e) => ({ date: e.date, kg: e.kg, avg7: rollingAvg(s, e.date)! }));
}

export interface WeekAvg {
  monday: string;
  avg: number;
  count: number;
  change: number | null;
}

/** Monday–Sunday averages, newest first, each compared to the week before it (when that week has entries). */
export function weeklyAverages(list: WeightEntry[]): WeekAvg[] {
  const byWeek = new Map<string, number[]>();
  for (const e of sortedEntries(list)) {
    const k = mondayKey(parseKey(e.date));
    const arr = byWeek.get(k) ?? [];
    arr.push(e.kg);
    byWeek.set(k, arr);
  }
  const weeks = [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([monday, v]) => ({ monday, avg: v.reduce((a, b) => a + b, 0) / v.length, count: v.length }));
  return weeks
    .map((w, i) => {
      const prev = weeks[i - 1];
      const adjacent = prev && dateKey(addDays(parseKey(prev.monday), 7)) === w.monday;
      return { ...w, change: adjacent ? w.avg - prev.avg : null };
    })
    .reverse();
}

/** Change in the 7-day average compared with 7 days earlier, in kg. */
export function weekOverWeek(list: WeightEntry[], todayKey: string): number | null {
  const s = sortedEntries(list);
  const now = rollingAvg(s, todayKey);
  const before = rollingAvg(s, dateKey(addDays(parseKey(todayKey), -7)));
  return now !== null && before !== null ? now - before : null;
}

export function fmtKg(kg: number, digits = 1): string {
  return kg.toFixed(digits);
}

export function fmtDelta(kg: number): string {
  const r = Math.round(kg * 10) / 10;
  if (r === 0) return '±0.0';
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(1)}`;
}

/** Accepts "82.4" or "82,4"; returns null outside a sane range. */
export function parseKg(text: string): number | null {
  const n = parseFloat(text.replace(',', '.'));
  if (!Number.isFinite(n) || n < 20 || n > 400) return null;
  return Math.round(n * 10) / 10;
}
