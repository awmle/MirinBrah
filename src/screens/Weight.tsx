import { useState } from 'react';
import { useData } from '../store';
import { ConfirmSheet, Sheet } from '../components';
import { dailySeries, fmtDelta, fmtKg, parseKg, rollingAvg, sortedEntries, weekOverWeek, weeklyAverages, type DayPoint } from '../weight';
import { addDays, dateKey, mediumDate, parseKey, shortDate, weekRange } from '../dates';
import { deleteWeight, logWeight } from '../actions';

type Range = '1M' | '3M' | '6M' | '1Y' | 'All';
const RANGE_DAYS: Record<Range, number | null> = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365, All: null };
let rememberedRange: Range = '3M';

export function Weight() {
  const data = useData();
  const todayKey = dateKey(new Date());
  const entries = sortedEntries(data.bodyweight);
  const today = entries.find((e) => e.date === todayKey) ?? null;
  const last = entries[entries.length - 1] ?? null;
  const [draft, setDraft] = useState('');
  const [range, setRangeState] = useState<Range>(rememberedRange);
  const setRange = (r: Range) => {
    rememberedRange = r;
    setRangeState(r);
  };
  const [editing, setEditing] = useState<{ date: string; isNew: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const avg7 = rollingAvg(entries, todayKey);
  const wow = weekOverWeek(entries, todayKey);
  const days = RANGE_DAYS[range];
  const since = days ? dateKey(addDays(new Date(), -days)) : '';
  const series = dailySeries(entries).filter((p) => p.date >= since);
  const weeks = weeklyAverages(entries);
  const history = [...entries].reverse();
  const parsed = parseKg(draft);

  const save = () => {
    if (parsed === null) return;
    logWeight(todayKey, parsed);
    setDraft('');
  };

  return (
    <>
      <main className="scroll">
        <h1 className="h1">Weight</h1>

        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="small muted">Today · {mediumDate(todayKey)}</span>
            {today && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Logged {fmtKg(today.kg)} kg</span>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            style={{ display: 'flex', gap: 10 }}
          >
            <label style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 14, padding: '0 16px', height: 56 }}>
              <span className="sr-only">Today's weight in kilograms</span>
              <input inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={today ? fmtKg(today.kg) : last ? fmtKg(last.kg) : '80.0'} style={{ flex: 1, minWidth: 0, width: '100%', border: 0, background: 'transparent', fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, outline: 'none' }} />
              <span className="muted" style={{ fontWeight: 600 }}>
                kg
              </span>
            </label>
            <button type="submit" className="btn primary" style={{ width: 110 }} disabled={parsed === null}>
              {today ? 'Update' : 'Save'}
            </button>
          </form>
        </section>

        <div className="tiles">
          <div className="tile">
            <span className="tile-label">7-day avg</span>
            <span className="tile-value">{avg7 !== null ? fmtKg(avg7) : '—'}</span>
          </div>
          <div className="tile">
            <span className="tile-label">vs last week</span>
            <span className="tile-value" style={{ color: wow === null ? undefined : 'var(--text)' }}>
              {wow !== null ? fmtDelta(wow) : '—'}
            </span>
          </div>
          <div className="tile">
            <span className="tile-label">Entries</span>
            <span className="tile-value">{entries.length}</span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="empty">Log your weight each morning. After a few days you'll see your daily trend and 7-day average here.</div>
        ) : (
          <>
            <section className="card" style={{ gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Trend</h2>
                <div className="legend">
                  <span>
                    <i style={{ background: '#6B7178', borderRadius: 5 }} />
                    Daily
                  </span>
                  <span>
                    <i style={{ background: 'var(--accent)', height: 3 }} />
                    7-day avg
                  </span>
                </div>
              </div>
              {series.length ? <WeightChart points={series} /> : <div className="empty" style={{ padding: 16 }}>Nothing logged in this range.</div>}
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
                  <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} style={{ fontSize: 12, fontWeight: 600, padding: '8px 11px', borderRadius: 8, color: range === r ? 'var(--text)' : 'var(--muted)', background: range === r ? 'var(--line)' : 'transparent' }}>
                    {r}
                  </button>
                ))}
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 className="eyebrow">Weekly averages</h2>
              <div className="list">
                {weeks.slice(0, 12).map((w) => (
                  <div key={w.monday} className="row">
                    <span className="row-main">
                      <span className="row-title">{weekRange(w.monday)}</span>
                      <span className="row-sub">
                        {w.count} of 7 days logged
                      </span>
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtKg(w.avg)} kg</span>
                      {w.change !== null && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtDelta(w.change)} kg</span>}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="eyebrow">Daily log</h2>
                <button type="button" className="link-btn" style={{ fontSize: 14, minHeight: 36 }} onClick={() => setEditing({ date: dateKey(addDays(new Date(), -1)), isNew: true })}>
                  + Add a past day
                </button>
              </div>
              <div className="list">
                {(showAll ? history : history.slice(0, 14)).map((e) => {
                  const avg = rollingAvg(entries, e.date);
                  return (
                    <button key={e.date} type="button" className="row" style={{ minHeight: 52 }} onClick={() => setEditing({ date: e.date, isNew: false })}>
                      <span className="row-main">
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{mediumDate(e.date)}</span>
                        {avg !== null && <span className="row-sub">7-day avg {fmtKg(avg)}</span>}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtKg(e.kg)} kg</span>
                    </button>
                  );
                })}
              </div>
              {history.length > 14 && !showAll && (
                <button type="button" className="btn ghost" onClick={() => setShowAll(true)}>
                  Show all {history.length} entries
                </button>
              )}
            </section>
          </>
        )}
      </main>
      {editing && <EditWeightSheet date={editing.date} isNew={editing.isNew} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditWeightSheet({ date: initialDate, isNew, onClose }: { date: string; isNew: boolean; onClose: () => void }) {
  const data = useData();
  const [date, setDate] = useState(initialDate);
  const existing = data.bodyweight.find((e) => e.date === date) ?? null;
  const [kg, setKg] = useState(existing ? fmtKg(existing.kg) : '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parsed = parseKg(kg);
  const todayKey = dateKey(new Date());

  if (confirmDelete) {
    return (
      <ConfirmSheet
        title={`Delete ${mediumDate(date)}?`}
        confirmLabel="Delete"
        danger
        onClose={onClose}
        onConfirm={() => {
          deleteWeight(date);
          onClose();
        }}
      />
    );
  }

  return (
    <Sheet label="Edit weight" onClose={onClose}>
      <h2 className="h2" style={{ fontSize: 22 }}>
        {isNew ? 'Log a past day' : mediumDate(date)}
      </h2>
      {isNew && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="small muted" style={{ fontWeight: 600 }}>
            Date
          </span>
          <input type="date" className="text-input" value={date} max={todayKey} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
      )}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="small muted" style={{ fontWeight: 600 }}>
          Weight (kg){isNew && existing ? ` · replaces ${fmtKg(existing.kg)} kg` : ''}
        </span>
        <input className="text-input" inputMode="decimal" value={kg} placeholder="80.0" onChange={(e) => setKg(e.target.value.replace(/[^0-9.,]/g, ''))} style={{ fontSize: 20 }} />
      </label>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn primary"
          style={{ flex: 2, height: 52 }}
          disabled={parsed === null || date > todayKey}
          onClick={() => {
            if (parsed === null) return;
            logWeight(date, parsed);
            onClose();
          }}
        >
          Save
        </button>
      </div>
      {!isNew && existing && (
        <button type="button" className="btn ghost danger" onClick={() => setConfirmDelete(true)}>
          Delete this entry
        </button>
      )}
    </Sheet>
  );
}

/** Daily weigh-ins as dots, 7-day rolling average as a line, x positioned by date. */
function WeightChart({ points }: { points: DayPoint[] }) {
  const W = 342;
  const H = 180;
  const top = 10;
  const base = 150;
  const left = 30;
  const vals = points.flatMap((p) => [p.kg, p.avg7]);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 1) {
    const mid = (hi + lo) / 2;
    lo = mid - 0.5;
    hi = mid + 0.5;
  }
  const pad = (hi - lo) * 0.1;
  lo -= pad;
  hi += pad;
  const t0 = parseKey(points[0].date).getTime();
  const t1 = parseKey(points[points.length - 1].date).getTime();
  const span = Math.max(1, t1 - t0);
  const x = (d: string) => (points.length === 1 ? (left + W) / 2 : left + 6 + ((parseKey(d).getTime() - t0) / span) * (W - left - 12));
  const y = (v: number) => base - ((v - lo) / (hi - lo)) * (base - top);
  const line = points.map((p) => `${x(p.date).toFixed(1)},${y(p.avg7).toFixed(1)}`).join(' ');
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad];
  const lastP = points[points.length - 1];
  return (
    <div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Body weight from ${shortDate(points[0].date)} to ${shortDate(lastP.date)}: daily entries and 7-day average, latest average ${fmtKg(lastP.avg7)} kg`} style={{ display: 'block', width: '100%', height: 'auto' }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={left} y1={y(t)} x2={W} y2={y(t)} stroke="#202327" strokeDasharray={i === 2 ? undefined : '3 4'} />
            <text x={0} y={y(t) + 4} fill="#9BA1A9" fontSize={11} fontFamily="Inter, sans-serif">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {points.map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={points.length > 120 ? 2 : 3} fill="#6B7178" />
        ))}
        {points.length > 1 && <polyline points={line} fill="none" stroke="#C8F65A" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        <circle cx={x(lastP.date)} cy={y(lastP.avg7)} r={5} fill="#C8F65A" stroke="#17191C" strokeWidth={2} />
        <text x={left} y={H - 4} fill="#9BA1A9" fontSize={11} fontFamily="Inter, sans-serif">
          {shortDate(points[0].date)}
        </text>
        <text x={W} y={H - 4} fill="#9BA1A9" fontSize={11} textAnchor="end" fontFamily="Inter, sans-serif">
          {shortDate(lastP.date)}
        </text>
      </svg>
    </div>
  );
}
