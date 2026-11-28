import { useState } from 'react';
import { useData } from '../store';
import { Icon, LineChart, Switch } from '../components';
import type { Go } from '../routes';
import type { Data } from '../types';
import { activeRoutine, daysAgoKey, doneSessions, exerciseName, exerciseSeries, fmtNum, fmtSet, fmtSets, fmtVolume, sessionPRs, sessionVolume, topSet, trendChange, bestE1rm } from '../logic';
import { dateKey, mediumDate, shortDate } from '../dates';

type Mode = 'workout' | 'exercise';
type Metric = 'top' | 'e1rm' | 'volume';
type Range = '1M' | '3M' | '6M' | 'All';

/** Survives switching screens, so coming back from a session summary keeps your place. */
const memory: { mode: Mode; day: string | null; exerciseId: string | null; metric: Metric; range: Range; showDeload: boolean } = {
  mode: 'workout',
  day: null,
  exerciseId: null,
  metric: 'top',
  range: '3M',
  showDeload: true
};

function useMemoryState<K extends keyof typeof memory>(key: K): [(typeof memory)[K], (v: (typeof memory)[K]) => void] {
  const [v, setV] = useState(memory[key]);
  return [
    v,
    (n) => {
      memory[key] = n;
      setV(n);
    }
  ];
}

export function Progress({ go }: { go: Go }) {
  const data = useData();
  const [mode, setMode] = useMemoryState('mode');
  const [exerciseId, setExerciseId] = useMemoryState('exerciseId');
  const openExercise = (id: string) => {
    setExerciseId(id);
    setMode('exercise');
  };

  return (
    <main className="scroll">
      <h1 className="h1">Progress</h1>
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'workout'} className={mode === 'workout' ? 'on' : ''} onClick={() => setMode('workout')}>
          By workout
        </button>
        <button type="button" role="tab" aria-selected={mode === 'exercise'} className={mode === 'exercise' ? 'on' : ''} onClick={() => setMode('exercise')}>
          By exercise
        </button>
      </div>
      {doneSessions(data).length === 0 ? (
        <div className="empty">
          <Icon name="chart" size={32} />
          <span>Finish your first workout and your progress shows up here.</span>
        </div>
      ) : mode === 'workout' ? (
        <ByWorkout data={data} onExercise={openExercise} />
      ) : (
        <ByExercise data={data} exerciseId={exerciseId} setExerciseId={setExerciseId} go={go} />
      )}
    </main>
  );
}

function lastDeload(data: Data): string | null {
  const today = dateKey(new Date());
  const past = data.deloadWeeks.filter((k) => k <= today).sort();
  return past.length ? past[past.length - 1] : null;
}

function ByWorkout({ data, onExercise }: { data: Data; onExercise: (id: string) => void }) {
  const routine = activeRoutine(data);
  const all = doneSessions(data);
  const names: string[] = [];
  for (const p of routine?.days ?? []) if (p && !names.includes(p.name)) names.push(p.name);
  for (const s of all) if (!names.includes(s.dayName)) names.push(s.dayName);
  const [picked, setPicked] = useMemoryState('day');
  const day = picked && names.includes(picked) ? picked : names[0];

  const sessions = all.filter((s) => s.dayName === day);
  const recent = sessions.slice(-8);
  const vols = recent.map((s) => ({ v: sessionVolume(s), deload: s.deload }));
  const max = Math.max(1, ...vols.map((x) => x.v));
  const change = trendChange(vols);
  const prCount = sessions.reduce((a, s) => a + sessionPRs(data, s).length, 0);
  const ld = lastDeload(data);

  const plan = routine?.days.find((p) => p?.name === day) ?? null;
  const planIds = plan ? plan.items.map((i) => i.exerciseId) : [];
  const seen: string[] = [];
  for (const s of sessions) for (const e of s.entries) if (!seen.includes(e.exerciseId)) seen.push(e.exerciseId);
  const current = planIds.length ? planIds : seen;
  const retired = seen.filter((id) => !current.includes(id));

  const exerciseRows = current.map((id) => {
    const withIt = recent.filter((s) => s.entries.some((e) => e.exerciseId === id && topSet(e)));
    const first = withIt.find((s) => !s.deload) ?? withIt[0];
    const lastS = [...withIt].reverse().find((s) => !s.deload) ?? withIt[withIt.length - 1];
    const t1 = first ? topSet(first.entries.find((e) => e.exerciseId === id)!) : null;
    const t2 = lastS ? topSet(lastS.entries.find((e) => e.exerciseId === id)!) : null;
    let delta = '';
    if (t1 && t2 && first !== lastS) {
      const d = t2.w - t1.w;
      delta = d === 0 ? (t2.r - t1.r ? `${t2.r - t1.r > 0 ? '+' : '−'}${Math.abs(t2.r - t1.r)} reps` : 'Same') : `${d > 0 ? '+' : '−'}${fmtNum(Math.abs(d))} lb`;
    }
    return { id, name: exerciseName(data, id), top: t2 ? fmtSet(t2) : null, delta, up: delta.startsWith('+') };
  });

  return (
    <>
      <div className="chips">
        {names.map((n) => (
          <button key={n} type="button" className={`chip${n === day ? ' on' : ''}`} aria-pressed={n === day} onClick={() => setPicked(n)}>
            {n}
          </button>
        ))}
      </div>

      {recent.length === 0 ? (
        <div className="empty">No {day} workouts logged yet.</div>
      ) : (
        <>
          <section className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="small muted">Volume per session · lbs</span>
              <span style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700 }}>{fmtNum(vols[vols.length - 1].v)}</span>
              {change !== null && (
                <span style={{ fontSize: 13, fontWeight: 600, color: change >= 0 ? 'var(--accent)' : 'var(--muted)' }}>
                  {change >= 0 ? '+' : '−'}
                  {Math.round(Math.abs(change) * 100)}% over last {recent.length} sessions · deloads excluded
                </span>
              )}
            </div>
            <div className="bars" role="img" aria-label={`${day} volume for the last ${recent.length} sessions`}>
              {vols.map((x, i) => (
                <span key={recent[i].id} className={`bar${x.deload ? ' deload' : i === vols.length - 1 ? ' last' : ''}`} style={{ height: `${Math.round((x.v / max) * 112)}px` }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
              <span>{shortDate(recent[0].date)}</span>
              <span>{shortDate(recent[recent.length - 1].date)}</span>
            </div>
            <div className="legend">
              <span>
                <i style={{ background: 'var(--olive)' }} />
                Training
              </span>
              <span>
                <i style={{ border: '1.5px dashed var(--muted)' }} />
                Deload
              </span>
            </div>
          </section>

          <div className="tiles">
            <div className="tile">
              <span className="tile-label">Sessions</span>
              <span className="tile-value">{sessions.length}</span>
            </div>
            <div className="tile">
              <span className="tile-label">PRs</span>
              <span className="tile-value">{prCount}</span>
            </div>
            <div className="tile">
              <span className="tile-label">Last deload</span>
              <span className="tile-value">{ld ? shortDate(ld) : 'None'}</span>
            </div>
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="eyebrow">Exercises in {day}</h2>
            <div className="list">
              {exerciseRows.map((r) => (
                <button key={r.id} type="button" className="row" onClick={() => onExercise(r.id)}>
                  <span className="row-main">
                    <span className="row-title">{r.name}</span>
                    <span className="row-sub" style={{ fontSize: 12 }}>
                      {r.top ? `Top set ${r.top}` : 'Not logged yet'}
                    </span>
                  </span>
                  {r.delta && <span style={{ fontSize: 13, fontWeight: 700, color: r.up ? 'var(--accent)' : 'var(--muted)' }}>{r.delta}</span>}
                  <span className="muted">
                    <Icon name="chevron-right" size={18} />
                  </span>
                </button>
              ))}
              {retired.map((id) => (
                <button key={id} type="button" className="row" onClick={() => onExercise(id)} style={{ color: 'var(--muted)' }}>
                  <span className="row-main">
                    <span className="row-title">{exerciseName(data, id)}</span>
                    <span style={{ fontSize: 12 }}>No longer in {day} · history kept</span>
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}

const RANGE_DAYS: Record<Range, number | null> = { '1M': 30, '3M': 91, '6M': 182, All: null };

function ByExercise({ data, exerciseId, setExerciseId, go }: { data: Data; exerciseId: string | null; setExerciseId: (id: string) => void; go: Go }) {
  const [metric, setMetric] = useMemoryState('metric');
  const [range, setRange] = useMemoryState('range');
  const [showDeload, setShowDeload] = useMemoryState('showDeload');

  const withHistory = data.exercises.filter((e) => exerciseSeries(data, e.id).length > 0).sort((a, b) => a.name.localeCompare(b.name));
  if (withHistory.length === 0) return <div className="empty">No exercises logged yet.</div>;
  const id = exerciseId && withHistory.some((e) => e.id === exerciseId) ? exerciseId : withHistory[0].id;

  const days = RANGE_DAYS[range];
  const series = exerciseSeries(data, id, days ? daysAgoKey(days) : undefined);
  const shown = series.filter((p) => showDeload || !p.deload);
  const val = (p: (typeof series)[number]) => (metric === 'top' ? p.top : metric === 'e1rm' ? p.e1rm : p.volume);
  const chartPts = shown.map((p) => ({ v: val(p), deload: p.deload }));
  const real = shown.filter((p) => !p.deload);
  let change = '';
  if (real.length >= 2) {
    const a = val(real[0]);
    const b = val(real[real.length - 1]);
    if (metric === 'volume') change = a ? `${b >= a ? '+' : '−'}${Math.round(Math.abs((b - a) / a) * 100)}%` : '';
    else change = `${b >= a ? '+' : '−'}${fmtNum(Math.abs(b - a))} lb`;
  }
  const latest = shown[shown.length - 1];
  const deloadCount = series.filter((p) => p.deload).length;

  let best: { v: number; label: string } | null = null;
  for (const p of exerciseSeries(data, id)) {
    const b = bestE1rm(p.entry);
    if (b && (!best || b.value > best.v)) best = { v: b.value, label: fmtSet(b.set) };
  }

  const prSessions = new Set(
    doneSessions(data)
      .filter((s) => sessionPRs(data, s).some((pr) => pr.exerciseId === id))
      .map((s) => s.id)
  );
  const history = [...series].reverse();
  const metrics: [Metric, string][] = [
    ['top', 'Top set'],
    ['e1rm', 'Est. 1RM'],
    ['volume', 'Volume']
  ];
  const name = exerciseName(data, id);

  return (
    <>
      <label style={{ position: 'relative', display: 'block' }}>
        <span className="sr-only">Exercise</span>
        <select value={id} onChange={(e) => setExerciseId(e.target.value)} style={{ width: '100%', height: 56, borderRadius: 14, border: 0, background: 'var(--surface)', padding: '18px 44px 0 16px', fontWeight: 700, appearance: 'none', WebkitAppearance: 'none' }}>
          {withHistory.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <span style={{ position: 'absolute', left: 16, top: 8, fontSize: 11, fontWeight: 600, color: 'var(--muted)', pointerEvents: 'none' }}>EXERCISE</span>
        <span style={{ position: 'absolute', right: 14, top: 18, color: 'var(--muted)', pointerEvents: 'none' }}>
          <Icon name="chevron-down" />
        </span>
      </label>

      <section className="card" style={{ gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {metrics.map(([m, label]) => (
            <button key={m} type="button" className={`chip${metric === m ? ' on' : ''}`} style={{ height: 32, padding: '0 12px', fontSize: 13 }} aria-pressed={metric === m} onClick={() => setMetric(m)}>
              {label}
            </button>
          ))}
        </div>
        {latest ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 700 }}>
                {metric === 'volume' ? fmtVolume(val(latest)) : fmtNum(val(latest))} lb
              </span>
              {change && <span style={{ fontSize: 13, fontWeight: 600, color: change.startsWith('+') ? 'var(--accent)' : 'var(--muted)' }}>{change} since {shortDate(real[0].date)}</span>}
            </div>
            <LineChart points={chartPts} label={`${name} ${metrics.find((m) => m[0] === metric)![1]} over time`} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
              <span>{shortDate(shown[0].date)}</span>
              <span>{shortDate(latest.date)}</span>
            </div>
          </>
        ) : (
          <div className="empty" style={{ padding: 16 }}>
            Nothing logged in this range.
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} style={{ fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 8, color: range === r ? 'var(--text)' : 'var(--muted)', background: range === r ? 'var(--line)' : 'transparent' }}>
              {r}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Show deload weeks</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {showDeload ? 'Shaded on the chart, hollow dot' : 'Hidden so the trend line stays smooth'}
            </span>
          </span>
          <Switch on={showDeload} onChange={setShowDeload} label="Show deload weeks" />
        </div>
      </section>

      <div className="tiles two">
        <div className="tile">
          <span className="tile-label">Deload sessions ({range === 'All' ? 'all time' : range})</span>
          <span className="tile-value">{deloadCount}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Best set (est. 1RM)</span>
          <span className="tile-value">{best ? best.label : '—'}</span>
        </div>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="eyebrow">History</h2>
        {history.length === 0 ? (
          <div className="empty" style={{ padding: 16 }}>
            Nothing logged in this range.
          </div>
        ) : (
          <div className="list">
            {history.map((p, i) => (
              <button key={p.sessionId + i} type="button" className="row" onClick={() => go({ name: 'summary', sessionId: p.sessionId, back: { name: 'tab', tab: 'progress' } })}>
                <span className="row-main">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{mediumDate(p.date)}</span>
                  <span className="row-sub">{fmtSets(p.entry)}</span>
                  {p.entry.note.trim() && (
                    <span className="note-text" style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--text-2)', marginTop: 4 }}>
                      {p.entry.note.trim()}
                    </span>
                  )}
                </span>
                {prSessions.has(p.sessionId) && <span className="tag accent">PR</span>}
                {p.deload && <span className="tag deload">DELOAD</span>}
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
