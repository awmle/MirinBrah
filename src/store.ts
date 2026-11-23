import { useSyncExternalStore } from 'react';
import type { Data } from './types';

const KEY = 'mirinbrah:data:v1';

export function emptyData(): Data {
  return { version: 1, exercises: [], routines: [], activeRoutineId: null, sessions: [], deloadWeeks: [], bodyweight: [] };
}

export function isValidData(x: unknown): x is Data {
  const d = x as Data;
  return !!d && d.version === 1 && Array.isArray(d.exercises) && Array.isArray(d.routines) && Array.isArray(d.sessions) && Array.isArray(d.deloadWeeks);
}

/** Fills in fields added after a backup or saved copy was made. */
export function normalize(d: Data): Data {
  return { ...d, bodyweight: Array.isArray(d.bodyweight) ? d.bodyweight : [] };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidData(parsed)) return normalize(parsed);
    }
  } catch {
    /* fall through to empty data */
  }
  return emptyData();
}

let data: Data = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable; the in-memory copy still works for this session */
  }
}

export function getData(): Data {
  return data;
}

/** Applies a change to a copy of the data, saves it, and re-renders subscribers. */
export function update(mutate: (d: Data) => void): void {
  const next = structuredClone(data);
  mutate(next);
  data = next;
  persist();
  listeners.forEach((l) => l());
}

export function replaceData(next: Data): void {
  data = normalize(next);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useData(): Data {
  return useSyncExternalStore(subscribe, getData);
}

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}
