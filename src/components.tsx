import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useData } from './store';

type IconName = 'calendar' | 'dumbbell' | 'chart' | 'scale' | 'play' | 'chevron-right' | 'chevron-left' | 'chevron-down' | 'close' | 'plus' | 'check' | 'more' | 'swap' | 'note' | 'info' | 'trophy' | 'gear' | 'up' | 'down';

const PATHS: Record<IconName, ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  dumbbell: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  chart: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  scale: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M7.5 10a6 6 0 0 1 9 0M12 12.5l1.8-3.3" />
    </>
  ),
  play: <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </>
  ),
  swap: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  note: <path d="M4 20h4l10-10-4-4L4 16v4zM13.5 6.5l4 4" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />
};

export function Icon({ name, size = 20, stroke = 2 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export type Tab = 'today' | 'routines' | 'progress' | 'weight';

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const items: [Tab, IconName, string][] = [
    ['today', 'calendar', 'Today'],
    ['routines', 'dumbbell', 'Routines'],
    ['progress', 'chart', 'Progress'],
    ['weight', 'scale', 'Weight']
  ];
  return (
    <nav className="tabbar" aria-label="Tabs">
      {items.map(([t, icon, label]) => (
        <button key={t} type="button" className={`tab${tab === t ? ' on' : ''}`} aria-current={tab === t ? 'page' : undefined} onClick={() => onTab(t)}>
          <Icon name={icon} size={24} stroke={1.8} />
          {label}
        </button>
      ))}
    </nav>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <span className="sheet-handle" />
        {children}
      </section>
    </div>
  );
}

/** Sheet for typing an exercise name, with suggestions from exercises you've used before. */
export function ExerciseNameSheet({ title, subtitle, confirmLabel, info, onConfirm, onClose }: { title: string; subtitle?: string; confirmLabel: string; info?: ReactNode; onConfirm: (name: string) => void; onClose: () => void }) {
  const data = useData();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(t);
  }, []);
  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    const list = data.exercises.filter((e) => (q ? e.name.toLowerCase().includes(q) && e.name.toLowerCase() !== q : true));
    return list.slice(0, 6);
  }, [data.exercises, draft]);
  const submit = () => {
    if (draft.trim()) onConfirm(draft.trim());
  };
  return (
    <Sheet label={title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {subtitle && <span className="small muted">{subtitle}</span>}
        <h2 className="h2" style={{ fontSize: 22 }}>
          {title}
        </h2>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <label htmlFor="exercise-name" className="small muted" style={{ fontWeight: 600 }}>
          Exercise name
        </label>
        <input id="exercise-name" ref={inputRef} className="text-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Incline Bench Press" autoComplete="off" autoCapitalize="words" enterKeyHint="done" />
      </form>
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="small muted">You've used before</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((s) => (
              <button key={s.id} type="button" className="chip" onClick={() => setDraft(s.name)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {info && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bar)', borderRadius: 14, padding: '12px 14px' }}>
          <span style={{ color: 'var(--accent)', flex: 'none', marginTop: 1 }}>
            <Icon name="info" size={18} />
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>{info}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn primary" style={{ flex: 2, height: 52 }} disabled={!draft.trim()} onClick={submit}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

export interface ChartPoint {
  v: number;
  deload: boolean;
}

/** Line chart with deload points drawn hollow and their weeks shaded. */
export function LineChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const W = 342;
  const H = 160;
  const base = 150;
  if (points.length === 0) return null;
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const pad = (hi - lo) * 0.1 || Math.max(1, hi * 0.05);
  const n = points.length;
  const step = n > 1 ? (W - 16) / (n - 1) : 0;
  const xy = points.map((p, i) => {
    const x = n > 1 ? 8 + i * step : W / 2;
    const y = base - ((p.v - (lo - pad)) / (hi - lo + 2 * pad)) * 130;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, deload: p.deload };
  });
  const line = xy.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `M${xy[0].x},${base} L${xy.map((p) => `${p.x},${p.y}`).join(' L')} L${xy[n - 1].x},${base} Z`;
  const last = xy[n - 1];
  const bandW = Math.max(step, 14);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ display: 'block', width: '100%', height: 'auto' }}>
      {xy.map((p, i) => (p.deload ? <rect key={`b${i}`} x={p.x - bandW / 2} y={0} width={bandW} height={base} fill="#9BA1A9" fillOpacity={0.12} /> : null))}
      <line x1={0} y1={base} x2={W} y2={base} stroke="#2A2E33" />
      <line x1={0} y1={82} x2={W} y2={82} stroke="#202327" strokeDasharray="3 4" />
      {n > 1 && <path d={area} fill="#C8F65A" fillOpacity={0.1} />}
      {n > 1 && <polyline points={line} fill="none" stroke="#C8F65A" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
      {xy.map((p, i) => (p.deload && i !== n - 1 ? <circle key={`d${i}`} cx={p.x} cy={p.y} r={4.5} fill="#17191C" stroke="#C8F65A" strokeWidth={2} /> : null))}
      <circle cx={last.x} cy={last.y} r={5} fill={last.deload ? '#17191C' : '#C8F65A'} stroke={last.deload ? '#C8F65A' : '#17191C'} strokeWidth={2} />
    </svg>
  );
}

export function ConfirmSheet({ title, body, confirmLabel, danger, onConfirm, onClose }: { title: string; body?: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet label={title} onClose={onClose}>
      <h2 className="h2" style={{ fontSize: 22 }}>
        {title}
      </h2>
      {body && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)' }}>{body}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={danger ? 'btn danger' : 'btn primary'} style={{ flex: 1, height: 52 }} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
