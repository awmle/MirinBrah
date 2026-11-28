import type { Data, DayPlan, PlanItem, Session } from './types';
import { update } from './store';
import { buildSession, uid } from './logic';
import { dateKey, mondayKey } from './dates';

export function findOrCreateExercise(d: Data, name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  const found = d.exercises.find((e) => e.name.toLowerCase() === clean.toLowerCase());
  if (found) return found.id;
  const id = uid();
  d.exercises.push({ id, name: clean });
  return id;
}

export function createRoutine(name: string): string {
  const id = uid();
  update((d) => {
    d.routines.push({ id, name, days: [null, null, null, null, null, null, null], createdAt: new Date().toISOString() });
    if (!d.activeRoutineId) d.activeRoutineId = id;
  });
  return id;
}

export function renameRoutine(id: string, name: string) {
  update((d) => {
    const r = d.routines.find((x) => x.id === id);
    if (r) r.name = name;
  });
}

export function deleteRoutine(id: string) {
  update((d) => {
    d.routines = d.routines.filter((r) => r.id !== id);
    if (d.activeRoutineId === id) d.activeRoutineId = d.routines[0]?.id ?? null;
  });
}

export function setActiveRoutine(id: string) {
  update((d) => {
    d.activeRoutineId = id;
  });
}

function withDay(d: Data, routineId: string, day: number, fn: (plan: DayPlan) => void) {
  const r = d.routines.find((x) => x.id === routineId);
  const plan = r?.days[day];
  if (plan) fn(plan);
}

export function assignDay(routineId: string, day: number, name: string) {
  update((d) => {
    const r = d.routines.find((x) => x.id === routineId);
    if (r) r.days[day] = { name, items: [] };
  });
}

export function makeRestDay(routineId: string, day: number) {
  update((d) => {
    const r = d.routines.find((x) => x.id === routineId);
    if (r) r.days[day] = null;
  });
}

export function renameDay(routineId: string, day: number, name: string) {
  update((d) => withDay(d, routineId, day, (p) => (p.name = name)));
}

export function addItem(routineId: string, day: number, exerciseName: string) {
  update((d) => {
    const exerciseId = findOrCreateExercise(d, exerciseName);
    withDay(d, routineId, day, (p) => p.items.push({ id: uid(), exerciseId, sets: 3, reps: '8–12', restSec: 120, note: '' }));
  });
}

export function updateItem(routineId: string, day: number, itemId: string, patch: Partial<PlanItem>) {
  update((d) =>
    withDay(d, routineId, day, (p) => {
      const it = p.items.find((x) => x.id === itemId);
      if (it) Object.assign(it, patch);
    })
  );
}

export function clearDeloadOverride(routineId: string, day: number, itemId: string) {
  update((d) =>
    withDay(d, routineId, day, (p) => {
      const it = p.items.find((x) => x.id === itemId);
      if (it) delete it.deloadSets;
    })
  );
}

export function removeItem(routineId: string, day: number, itemId: string) {
  update((d) => withDay(d, routineId, day, (p) => (p.items = p.items.filter((x) => x.id !== itemId))));
}

export function moveItem(routineId: string, day: number, itemId: string, dir: -1 | 1) {
  update((d) =>
    withDay(d, routineId, day, (p) => {
      const i = p.items.findIndex((x) => x.id === itemId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.items.length) return;
      [p.items[i], p.items[j]] = [p.items[j], p.items[i]];
    })
  );
}

/** Points the slot at a different exercise. Sets, reps, rest and note stay; old history stays with the old exercise. */
export function replaceItemExercise(routineId: string, day: number, itemId: string, exerciseName: string) {
  update((d) => {
    const exerciseId = findOrCreateExercise(d, exerciseName);
    withDay(d, routineId, day, (p) => {
      const it = p.items.find((x) => x.id === itemId);
      if (it) it.exerciseId = exerciseId;
    });
  });
}

export function setDeloadWeek(date: Date, on: boolean) {
  const key = mondayKey(date);
  update((d) => {
    d.deloadWeeks = d.deloadWeeks.filter((k) => k !== key);
    if (on) d.deloadWeeks.push(key);
  });
}

export function startSession(date: Date): string | null {
  let id: string | null = null;
  update((d) => {
    const r = d.routines.find((x) => x.id === d.activeRoutineId);
    const day = r?.days[(date.getDay() + 6) % 7];
    if (!r || !day) return;
    const s = buildSession(r, day, date, d.deloadWeeks.includes(mondayKey(date)));
    d.sessions = d.sessions.filter((x) => !(x.date === s.date && x.status === 'skipped'));
    d.sessions.push(s);
    id = s.id;
  });
  return id;
}

export function skipDay(date: Date) {
  update((d) => {
    const r = d.routines.find((x) => x.id === d.activeRoutineId);
    const day = r?.days[(date.getDay() + 6) % 7];
    if (!r || !day) return;
    d.sessions.push({
      id: uid(),
      routineId: r.id,
      dayName: day.name,
      date: dateKey(date),
      status: 'skipped',
      deload: false,
      entries: [],
      note: '',
      currentIndex: 0
    });
  });
}

export function undoSkip(date: Date) {
  const key = dateKey(date);
  update((d) => {
    d.sessions = d.sessions.filter((s) => !(s.date === key && s.status === 'skipped'));
  });
}

export function updateSession(id: string, fn: (s: Session) => void) {
  update((d) => {
    const s = d.sessions.find((x) => x.id === id);
    if (s) fn(s);
  });
}

export function finishSession(id: string) {
  updateSession(id, (s) => {
    s.status = 'done';
    s.endedAt = Date.now();
  });
}

export function discardSession(id: string) {
  update((d) => {
    d.sessions = d.sessions.filter((s) => s.id !== id);
  });
}

export function deleteSession(id: string) {
  discardSession(id);
}

/** Saves one weigh-in per day; logging again on the same day replaces it. */
export function logWeight(date: string, kg: number) {
  update((d) => {
    d.bodyweight = d.bodyweight.filter((e) => e.date !== date);
    d.bodyweight.push({ date, kg });
  });
}

export function deleteWeight(date: string) {
  update((d) => {
    d.bodyweight = d.bodyweight.filter((e) => e.date !== date);
  });
}

/** Saves the note for one exercise in one workout. Earlier workouts keep their own notes. */
export function updateExerciseNote(sessionId: string, entryIndex: number, note: string) {
  update((d) => {
    const entry = d.sessions.find((x) => x.id === sessionId)?.entries[entryIndex];
    if (entry) entry.note = note;
  });
}
