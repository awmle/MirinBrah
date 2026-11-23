export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday = 0 … Sunday = 6. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

export function mondayOf(d: Date): Date {
  return addDays(d, -weekdayIndex(d));
}

export function mondayKey(d: Date): string {
  return dateKey(mondayOf(d));
}

/** "Nov 23" */
export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Monday, Nov 23" */
export function longDate(d: Date): string {
  return `${WEEKDAYS[weekdayIndex(d)]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Mon, Nov 23" */
export function mediumDate(key: string): string {
  const d = parseKey(key);
  return `${WEEKDAYS_SHORT[weekdayIndex(d)]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 23–29" or "Nov 30–Dec 6" */
export function weekRange(monday: string): string {
  const start = parseKey(monday);
  const end = addDays(start, 6);
  const a = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  return start.getMonth() === end.getMonth() ? `${a}–${end.getDate()}` : `${a}–${MONTHS[end.getMonth()]} ${end.getDate()}`;
}

/** H:MM:SS */
export function clock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(t / 3600)}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

/** M:SS */
export function mmss(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** Parses "2:30", "90" or "1:5" into seconds. Returns null when unreadable. */
export function parseRest(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(\d+):(\d{1,2})$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
