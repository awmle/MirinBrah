export type ID = string;

export interface Exercise {
  id: ID;
  name: string;
}

export interface PlanItem {
  id: ID;
  exerciseId: ID;
  sets: number;
  /** Free text such as "8" or "6–8". */
  reps: string;
  restSec: number;
  /** Overrides the default deload set count (half the sets, rounded down, minimum 1). */
  deloadSets?: number;
  note: string;
}

export interface DayPlan {
  name: string;
  items: PlanItem[];
}

export interface Routine {
  id: ID;
  name: string;
  /** Index 0 = Monday … 6 = Sunday. null = rest day. */
  days: (DayPlan | null)[];
  createdAt: string;
}

export interface SetLog {
  weight: string;
  reps: string;
  done: boolean;
}

export interface Entry {
  id: ID;
  exerciseId: ID;
  reps: string;
  restSec: number;
  note: string;
  sets: SetLog[];
}

export type SessionStatus = 'active' | 'done' | 'skipped';

export interface Session {
  id: ID;
  routineId: ID;
  dayName: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  status: SessionStatus;
  deload: boolean;
  startedAt?: number;
  endedAt?: number;
  entries: Entry[];
  note: string;
  currentIndex: number;
}

export interface Data {
  version: 1;
  exercises: Exercise[];
  routines: Routine[];
  activeRoutineId: ID | null;
  sessions: Session[];
  /** Monday date keys (YYYY-MM-DD) of weeks marked as deload weeks. */
  deloadWeeks: string[];
  /** One body-weight entry per day, in kilograms. */
  bodyweight: WeightEntry[];
}

export interface WeightEntry {
  /** Local date, YYYY-MM-DD. */
  date: string;
  kg: number;
}
