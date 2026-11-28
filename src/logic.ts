import type { Data, DayPlan, Entry, PlanItem, Routine, Session, SetLog } from './types';
import { dateKey, mondayKey, parseKey } from './dates';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultDeloadSets(sets: number): number {
  return Math.max(1, Math.floor(sets / 2));
}

export function deloadSetsFor(item: PlanItem): number {
  return item.deloadSets ?? defaultDeloadSets(item.sets);
}

export function plannedSets(item: PlanItem, deload: boolean): number {
  return deload ? deloadSetsFor(item) : item.sets;
}

export function num(s: string): number {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export interface SetNum {
  w: number;
  r: number;
}

export function doneSets(entry: Entry): SetNum[] {
  return entry.sets.filter((s) => s.done && num(s.reps) > 0).map((s) => ({ w: num(s.weight), r: num(s.reps) }));
}

export function e1rm(w: number, r: number): number {
  return r <= 1 ? w : w * (1 + r / 30);
}

export function entryVolume(entry: Entry): number {
  return doneSets(entry).reduce((a, s) => a + s.w * s.r, 0);
}

export function topSet(entry: Entry): SetNum | null {
  let best: SetNum | null = null;
  for (const s of doneSets(entry)) {
    if (!best || s.w > best.w || (s.w === best.w && s.r > best.r)) best = s;
  }
  return best;
}

export function bestE1rm(entry: Entry): { value: number; set: SetNum } | null {
  let best: { value: number; set: SetNum } | null = null;
  for (const s of doneSets(entry)) {
    const v = e1rm(s.w, s.r);
    if (!best || v > best.value) best = { value: v, set: s };
  }
  return best;
}

export function sessionVolume(s: Session): number {
  return s.entries.reduce((a, e) => a + entryVolume(e), 0);
}

export function sessionDoneSetCount(s: Session): number {
  return s.entries.reduce((a, e) => a + doneSets(e).length, 0);
}

export function sessionDuration(s: Session, now = Date.now()): number {
  if (!s.startedAt) return 0;
  return (s.endedAt ?? now) - s.startedAt;
}

/** Completed sessions, oldest first. */
export function doneSessions(data: Data): Session[] {
  return data.sessions
    .filter((s) => s.status === 'done')
    .sort((a, b) => (a.date === b.date ? (a.startedAt ?? 0) - (b.startedAt ?? 0) : a.date < b.date ? -1 : 1));
}

function isBefore(a: Session, b: Session): boolean {
  if (a.date !== b.date) return a.date < b.date;
  return (a.startedAt ?? 0) < (b.startedAt ?? 0);
}

/** The most recent completed entry for an exercise that has at least one logged set, before `before` if given. */
export function lastEntryFor(data: Data, exerciseId: string, before?: Session): { session: Session; entry: Entry } | null {
  const list = doneSessions(data);
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (before && (s.id === before.id || !isBefore(s, before))) continue;
    const entry = s.entries.find((e) => e.exerciseId === exerciseId && doneSets(e).length > 0);
    if (entry) return { session: s, entry };
  }
  return null;
}

export interface PR {
  exerciseId: string;
  set: SetNum;
  prev: SetNum;
}

/** Personal records in a session: best estimated 1RM beating every earlier session. First-ever sessions don't count. */
export function sessionPRs(data: Data, session: Session): PR[] {
  const earlier = doneSessions(data).filter((s) => s.id !== session.id && isBefore(s, session));
  const prs: PR[] = [];
  for (const entry of session.entries) {
    const now = bestE1rm(entry);
    if (!now) continue;
    let prevBest: { value: number; set: SetNum } | null = null;
    for (const s of earlier) {
      for (const e of s.entries) {
        if (e.exerciseId !== entry.exerciseId) continue;
        const b = bestE1rm(e);
        if (b && (!prevBest || b.value > prevBest.value)) prevBest = b;
      }
    }
    if (prevBest && now.value > prevBest.value + 1e-9) prs.push({ exerciseId: entry.exerciseId, set: now.set, prev: prevBest.set });
  }
  return prs;
}

export function fmtNum(n: number): string {
  return Math.round(n * 10) / 10 === Math.round(n) ? Math.round(n).toLocaleString('en-US') : (Math.round(n * 10) / 10).toLocaleString('en-US');
}

export function fmtSet(s: SetNum): string {
  return `${fmtNum(s.w)} × ${fmtNum(s.r)}`;
}

/** "190 × 8, 8, 7, 7" or "185 × 8, 190 × 6" when weights differ. */
export function fmtSets(entry: Entry): string {
  const sets = doneSets(entry);
  if (!sets.length) return 'No sets logged';
  if (sets.every((s) => s.w === sets[0].w)) return `${fmtNum(sets[0].w)} × ${sets.map((s) => fmtNum(s.r)).join(', ')}`;
  return sets.map(fmtSet).join(', ');
}

export function fmtVolume(v: number): string {
  return v >= 10000 ? `${(v / 1000).toFixed(1)}k` : fmtNum(v);
}

export interface Delta {
  text: string;
  up: boolean;
}

/** Compares this entry to the previous time: top-set weight first, then total reps. */
export function compareEntries(now: Entry, prev: Entry | null): Delta {
  const a = topSet(now);
  if (!a) return { text: 'Not logged', up: false };
  if (!prev) return { text: 'First time', up: false };
  const b = topSet(prev);
  if (!b) return { text: 'First time', up: false };
  if (a.w !== b.w) {
    const d = a.w - b.w;
    return { text: `${d > 0 ? '+' : '−'}${fmtNum(Math.abs(d))} lb`, up: d > 0 };
  }
  const ra = doneSets(now).reduce((x, s) => x + s.r, 0);
  const rb = doneSets(prev).reduce((x, s) => x + s.r, 0);
  if (ra === rb) return { text: 'Same', up: false };
  const d = ra - rb;
  return { text: `${d > 0 ? '+' : '−'}${Math.abs(d)} rep${Math.abs(d) === 1 ? '' : 's'}`, up: d > 0 };
}

export function activeRoutine(data: Data): Routine | null {
  return data.routines.find((r) => r.id === data.activeRoutineId) ?? null;
}

export function isDeloadWeek(data: Data, d: Date): boolean {
  return data.deloadWeeks.includes(mondayKey(d));
}

export function sessionOn(data: Data, key: string): Session | null {
  const list = data.sessions.filter((s) => s.date === key);
  return list.find((s) => s.status === 'active') ?? list.find((s) => s.status === 'done') ?? list.find((s) => s.status === 'skipped') ?? null;
}

export function exerciseName(data: Data, id: string): string {
  return data.exercises.find((e) => e.id === id)?.name ?? 'Unknown exercise';
}

export function buildSession(routine: Routine, day: DayPlan, date: Date, deload: boolean): Session {
  return {
    id: uid(),
    routineId: routine.id,
    dayName: day.name,
    date: dateKey(date),
    status: 'active',
    deload,
    startedAt: Date.now(),
    entries: day.items.map((it) => ({
      id: uid(),
      exerciseId: it.exerciseId,
      reps: it.reps,
      restSec: it.restSec,
      note: '',
      sets: Array.from({ length: plannedSets(it, deload) }, (): SetLog => ({ weight: '', reps: '', done: false }))
    })),
    note: '',
    currentIndex: 0
  };
}

export interface SeriesPoint {
  date: string;
  sessionId: string;
  deload: boolean;
  top: number;
  e1rm: number;
  volume: number;
  entry: Entry;
}

export function exerciseSeries(data: Data, exerciseId: string, sinceKey?: string): SeriesPoint[] {
  const pts: SeriesPoint[] = [];
  for (const s of doneSessions(data)) {
    if (sinceKey && s.date < sinceKey) continue;
    const entries = s.entries.filter((e) => e.exerciseId === exerciseId && doneSets(e).length > 0);
    for (const e of entries) {
      const t = topSet(e)!;
      pts.push({ date: s.date, sessionId: s.id, deload: s.deload, top: t.w, e1rm: bestE1rm(e)!.value, volume: entryVolume(e), entry: e });
    }
  }
  return pts;
}

/** Percentage or absolute change between the first and last non-deload values. */
export function trendChange(values: { v: number; deload: boolean }[]): number | null {
  const real = values.filter((x) => !x.deload);
  if (real.length < 2 || real[0].v === 0) return null;
  return (real[real.length - 1].v - real[0].v) / real[0].v;
}

export function daysAgoKey(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days);
  return dateKey(d);
}

export function weeksBetween(aKey: string, bKey: string): number {
  return Math.round((parseKey(bKey).getTime() - parseKey(aKey).getTime()) / (7 * 86400000));
}

export interface NoteItem {
  sessionId: string | null;
  date: string | null;
  text: string;
  deload: boolean;
}

/**
 * Notes written for an exercise in past workouts, newest first. A note repeated in back-to-back workouts is shown once
 * (at its newest date). An older routine-level note, if any, comes last.
 */
export function exerciseNotes(data: Data, exerciseId: string, exclude?: Session): NoteItem[] {
  const out: NoteItem[] = [];
  const list = doneSessions(data);
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (exclude && s.id === exclude.id) continue;
    for (const e of s.entries) {
      const text = e.note.trim();
      if (e.exerciseId !== exerciseId || !text) continue;
      if (out.length && out[out.length - 1].text === text) continue;
      out.push({ sessionId: s.id, date: s.date, text, deload: s.deload });
    }
  }
  for (const r of data.routines) {
    for (const day of r.days) {
      for (const it of day?.items ?? []) {
        const text = it.note.trim();
        if (it.exerciseId === exerciseId && text && !out.some((n) => n.text === text)) out.push({ sessionId: null, date: null, text, deload: false });
      }
    }
  }
  return out;
}
