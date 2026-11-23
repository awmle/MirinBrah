import { useData } from '../store';
import { Icon, Switch } from '../components';
import type { Go } from '../routes';
import { activeRoutine, doneSessions, isDeloadWeek, plannedSets, sessionDuration, sessionOn, sessionPRs, exerciseName } from '../logic';
import { WEEKDAYS, WEEKDAYS_SHORT, addDays, clock, dateKey, longDate, mondayOf, mondayKey, parseKey, shortDate, weekRange, weekdayIndex } from '../dates';
import { setDeloadWeek, skipDay, startSession, undoSkip } from '../actions';
import { useNow } from '../hooks';
import { fmtKg, rollingAvg, sortedEntries } from '../weight';

export function Today({ go }: { go: Go }) {
  const data = useData();
  const nowMs = useNow(1000);
  const now = new Date(nowMs);
  const todayKey = dateKey(now);
  const routine = activeRoutine(data);
  const dayIdx = weekdayIndex(now);
  const plan = routine?.days[dayIdx] ?? null;
  const session = sessionOn(data, todayKey);
  const deload = isDeloadWeek(data, now);
  const monday = mondayOf(now);
  const weighIn = data.bodyweight.find((e) => e.date === todayKey) ?? null;
  const avg7 = rollingAvg(sortedEntries(data.bodyweight), todayKey);

  const week = WEEKDAYS_SHORT.map((label, i) => {
    const d = addDays(monday, i);
    const key = dateKey(d);
    const p = routine?.days[i] ?? null;
    const s = sessionOn(data, key);
    let cls = 'week-dot';
    let mark: string = p ? p.name.charAt(0).toUpperCase() || '•' : '–';
    if (!p && !s) cls += ' rest';
    else if (s?.status === 'done') {
      cls += ' done';
      mark = '✓';
    } else if (s?.status === 'skipped') {
      cls += ' skipped';
      mark = '×';
    } else if (key === todayKey) cls += ' today';
    else if (key < todayKey && p) cls += ' missed';
    return { label, key, cls, mark, name: p ? p.name : 'Rest', isToday: key === todayKey };
  });

  const last = doneSessions(data).filter((s) => s.id !== session?.id).pop() ?? null;
  const lastPRs = last ? sessionPRs(data, last).length : 0;

  let nextTraining: string | null = null;
  if (routine) {
    for (let k = 1; k <= 7; k++) {
      const p = routine.days[(dayIdx + k) % 7];
      if (p) {
        nextTraining = `${k === 1 ? 'Tomorrow' : WEEKDAYS[(dayIdx + k) % 7]} · ${p.name}`;
        break;
      }
    }
  }

  const start = () => {
    const id = startSession(now);
    if (id) go({ name: 'workout', sessionId: id });
  };

  const items = plan?.items ?? [];
  const totalSets = items.reduce((a, it) => a + plannedSets(it, deload), 0);
  const estMin = Math.round(items.reduce((a, it) => a + plannedSets(it, deload) * (45 + it.restSec), 0) / 60);

  return (
    <main className="scroll">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p className="eyebrow">{longDate(now)}</p>
          <h1 className="h1">Today</h1>
        </div>
        <button type="button" className="icon-btn" aria-label="Settings and backup" onClick={() => go({ name: 'settings' })} style={{ marginRight: -8 }}>
          <Icon name="gear" size={22} stroke={1.8} />
        </button>
      </div>

      {!routine && (
        <section className="card">
          <h2 className="h2" style={{ fontSize: 22 }}>
            Set up your week
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Create a routine, pick which weekday gets which workout, and add your exercises with sets and reps.
          </p>
          <button type="button" className="btn primary" onClick={() => go({ name: 'tab', tab: 'routines' })}>
            Create a routine
          </button>
        </section>
      )}

      {routine && (
        <>
          <section className="week" aria-label="This week">
            {week.map((d) => (
              <div className="week-day" key={d.key}>
                <span style={{ fontSize: 12, fontWeight: 600, color: d.isToday ? 'var(--text)' : 'var(--muted)' }}>{d.label}</span>
                <span className={d.cls}>{d.mark}</span>
                <span className="week-name">{d.name}</span>
              </div>
            ))}
          </section>

          <div className="card tight" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Deload week</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {deload ? `${weekRange(mondayKey(now))} · sets halved · ends Sunday` : 'Halves every day’s sets, Mon–Sun'}
              </span>
            </span>
            <Switch on={deload} onChange={(v) => setDeloadWeek(now, v)} label="Deload week" />
          </div>

          <button type="button" className="card tight" onClick={() => go({ name: 'tab', tab: 'weight' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--text)' }}>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Weight today</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {avg7 !== null ? `7-day avg ${fmtKg(avg7)} kg` : 'Log it every morning'}
              </span>
            </span>
            {weighIn ? (
              <span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700 }}>{fmtKg(weighIn.kg)} kg</span>
            ) : (
              <span className="btn small" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                Log
              </span>
            )}
          </button>

          {session?.status === 'active' && (
            <section className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="small muted">In progress</span>
                <h2 className="h2">{session.dayName}</h2>
                <span style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clock(sessionDuration(session, nowMs))}</span>
              </div>
              <button type="button" className="btn primary" onClick={() => go({ name: 'workout', sessionId: session.id })}>
                Resume workout
              </button>
            </section>
          )}

          {session?.status === 'done' && (
            <section className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Icon name="check" size={24} stroke={2.6} />
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <h2 className="h2" style={{ fontSize: 22 }}>
                    {session.dayName} done
                  </h2>
                  <span className="small muted">
                    {clock(sessionDuration(session))} · {nextTraining ? `Next: ${nextTraining}` : ''}
                  </span>
                </div>
              </div>
              <button type="button" className="btn" onClick={() => go({ name: 'summary', sessionId: session.id })}>
                View summary
              </button>
            </section>
          )}

          {session?.status === 'skipped' && (
            <section className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="small muted">
                  {WEEKDAYS[dayIdx]} · {session.dayName}
                </span>
                <h2 className="h2" style={{ fontSize: 24 }}>
                  Skipped
                </h2>
                <span className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>
                  Logged as missed, so it won't count in your progress.{nextTraining ? ` Next: ${nextTraining}.` : ''}
                </span>
              </div>
              <button type="button" className="btn" onClick={() => undoSkip(now)}>
                Undo skip
              </button>
            </section>
          )}

          {!session && !plan && (
            <section className="card">
              <span className="small muted">{routine.name}</span>
              <h2 className="h2">Rest day</h2>
              {nextTraining && <span className="muted" style={{ fontSize: 14 }}>Next: {nextTraining}</span>}
            </section>
          )}

          {!session && plan && (
            <section className="card" style={{ gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="small muted">
                    Every {WEEKDAYS[dayIdx]} · {routine.name}
                  </span>
                  {deload && <span className="tag deload">DELOAD</span>}
                </div>
                <h2 className="h2">{plan.name}</h2>
                <span className="muted" style={{ fontSize: 14 }}>
                  {items.length} exercise{items.length === 1 ? '' : 's'} · {totalSets} sets{items.length ? ` · ~${estMin} min` : ''}
                </span>
              </div>
              {items.length > 0 ? (
                <>
                  <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((it) => (
                      <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15 }}>
                        <span>{exerciseName(data, it.exerciseId)}</span>
                        <span className="muted" style={{ flex: 'none' }}>
                          {plannedSets(it, deload)} × {it.reps}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <button type="button" className="btn primary" onClick={start}>
                    <Icon name="play" />
                    Start workout
                  </button>
                  <button type="button" className="btn ghost" style={{ marginTop: -6 }} onClick={() => skipDay(now)}>
                    Skip today
                  </button>
                </>
              ) : (
                <button type="button" className="btn" onClick={() => go({ name: 'editDay', routineId: routine.id, day: dayIdx })}>
                  Add exercises
                </button>
              )}
            </section>
          )}

          {last && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 className="eyebrow">Last session</h3>
              <button type="button" className="list" onClick={() => go({ name: 'summary', sessionId: last.id })}>
                <span className="row">
                  <span className="row-main">
                    <span className="row-title">
                      {WEEKDAYS[weekdayIndex(parseKey(last.date))]} · {last.dayName}
                    </span>
                    <span className="row-sub">
                      {shortDate(last.date)} · {clock(sessionDuration(last))}
                      {lastPRs ? ` · ${lastPRs} PR${lastPRs === 1 ? '' : 's'}` : ''}
                      {last.deload ? ' · deload' : ''}
                    </span>
                  </span>
                  <span className="muted">
                    <Icon name="chevron-right" />
                  </span>
                </span>
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}
