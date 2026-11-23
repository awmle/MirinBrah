import { useEffect, useRef, useState } from 'react';
import { useData } from '../store';
import { Icon, Sheet } from '../components';
import type { Go } from '../routes';
import { bestE1rm, doneSessions, exerciseName, fmtSet, lastEntryFor, num, sessionDuration, type SetNum } from '../logic';
import { clock, mediumDate, mmss } from '../dates';
import { discardSession, finishSession, updateSession } from '../actions';
import { beep, unlockAudio, useNow, useWakeLock } from '../hooks';

interface RestState {
  endsAt: number;
  beeped: boolean;
}

export function Workout({ sessionId, go }: { sessionId: string; go: Go }) {
  const data = useData();
  const now = useNow(250);
  useWakeLock();
  const session = data.sessions.find((s) => s.id === sessionId);
  const [rest, setRest] = useState<RestState | null>(null);
  const [endSheet, setEndSheet] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const idx = session ? Math.min(session.currentIndex, Math.max(0, session.entries.length - 1)) : 0;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [idx]);

  const remaining = rest ? rest.endsAt - now : 0;
  useEffect(() => {
    if (rest && !rest.beeped && remaining <= 0) {
      beep();
      setRest({ ...rest, beeped: true });
    }
  }, [rest, remaining]);

  useEffect(() => {
    if (!session || session.status !== 'active') go({ name: 'tab', tab: 'today' });
  }, [session, go]);

  if (!session || session.status !== 'active') return null;

  const entries = session.entries;
  const finish = () => {
    finishSession(session.id);
    go({ name: 'summary', sessionId: session.id, justFinished: true });
  };

  if (entries.length === 0) {
    return (
      <main className="scroll">
        <p className="muted">This workout has no exercises.</p>
        <button type="button" className="btn primary" onClick={finish}>
          Finish
        </button>
      </main>
    );
  }

  const entry = entries[idx];
  const name = exerciseName(data, entry.exerciseId);
  const prev = lastEntryFor(data, entry.exerciseId, session);
  const prevSets: SetNum[] = prev ? prev.entry.sets.filter((s) => s.done && num(s.reps) > 0).map((s) => ({ w: num(s.weight), r: num(s.reps) })) : [];
  let best: SetNum | null = null;
  let bestVal = 0;
  for (const s of doneSessions(data)) {
    if (s.id === session.id) continue;
    for (const e of s.entries) {
      if (e.exerciseId !== entry.exerciseId) continue;
      const b = bestE1rm(e);
      if (b && b.value > bestVal) {
        bestVal = b.value;
        best = b.set;
      }
    }
  }
  const isLast = idx === entries.length - 1;
  const hint = (i: number) => prevSets[i] ?? prevSets[prevSets.length - 1] ?? null;

  const setField = (i: number, field: 'weight' | 'reps', v: string) =>
    updateSession(session.id, (s) => {
      s.entries[idx].sets[i][field] = v.replace(/[^0-9.,]/g, '');
    });

  const toggle = (i: number) => {
    unlockAudio();
    const set = entry.sets[i];
    const turningOn = !set.done;
    updateSession(session.id, (s) => {
      const t = s.entries[idx].sets[i];
      if (turningOn) {
        const h = hint(i);
        if (!t.weight.trim() && h) t.weight = String(h.w);
        if (!t.reps.trim() && h) t.reps = String(h.r);
      }
      t.done = turningOn;
    });
    if (turningOn && entry.restSec > 0) setRest({ endsAt: Date.now() + entry.restSec * 1000, beeped: false });
  };

  const goTo = (n: number) => updateSession(session.id, (s) => (s.currentIndex = n));

  const restBox = rest && (
    <div className={`rest${remaining <= 0 ? ' over' : ''}`} role="status">
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: remaining <= 0 ? 'var(--accent-ink)' : 'var(--accent-text)' }}>{remaining <= 0 ? 'Rest over' : 'Rest'}</span>
        <span style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: remaining <= 0 ? 'var(--accent-ink)' : 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{remaining <= 0 ? 'Go' : mmss(remaining / 1000)}</span>
      </span>
      <span style={{ display: 'flex', gap: 8 }}>
        {remaining > 0 && (
          <button type="button" onClick={() => setRest({ endsAt: rest.endsAt + 30000, beeped: false })}>
            +30s
          </button>
        )}
        <button type="button" onClick={() => setRest(null)}>
          {remaining > 0 ? 'Skip' : 'Dismiss'}
        </button>
      </span>
    </div>
  );

  return (
    <>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'calc(var(--safe-top) + 8px) 20px 8px', flex: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="icon-btn" aria-label="End workout" style={{ marginLeft: -10 }} onClick={() => setEndSheet(true)}>
            <Icon name="close" size={22} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
              {session.dayName}
              {session.deload ? ' · Deload' : ''}
            </span>
            <span role="timer" aria-label="Workout time" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)' }} />
              {clock(sessionDuration(session, now))}
            </span>
          </div>
          <span style={{ width: 44, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
            {idx + 1}/{entries.length}
          </span>
        </div>
        <div className="segments" aria-hidden="true">
          {entries.map((e, i) => (
            <span key={e.id} className={i < idx ? 'past' : i === idx ? 'now' : ''} />
          ))}
        </div>
      </header>

      <main ref={mainRef} className="scroll" style={{ paddingTop: 12, gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
            Target {entry.sets.length} × {entry.reps}
            {entry.restSec ? ` · rest ${mmss(entry.restSec)}` : ''}
          </div>
          <h1 className="h1" style={{ fontSize: 30, lineHeight: 1.1 }}>
            {name}
          </h1>
        </div>

        {entry.note && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface)', borderRadius: 14, padding: '12px 14px' }}>
            <span className="muted" style={{ flex: 'none', marginTop: 1 }}>
              <Icon name="note" size={18} />
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--text-2)', whiteSpace: 'pre-line' }}>{entry.note}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--muted)' }}>
          <span>{prev ? `Last time · ${mediumDate(prev.session.date)}${prev.session.deload ? ' (deload)' : ''}` : 'First time doing this'}</span>
          {best && <span>Best · {fmtSet(best)}</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="set-grid set-head">
            <span>SET</span>
            <span>PREVIOUS</span>
            <span>LBS</span>
            <span>REPS</span>
            <span />
          </div>
          {entry.sets.map((s, i) => {
            const h = prevSets[i] ?? null;
            const ph = hint(i);
            return (
              <div key={i} className={`set-grid set-row${s.done ? ' done' : ''}`}>
                <span style={{ fontSize: 15, fontWeight: 700, textAlign: 'center' }}>{i + 1}</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>{h ? fmtSet(h) : '—'}</span>
                <label>
                  <span className="sr-only">Set {i + 1} weight in pounds</span>
                  <input className="set-input" inputMode="decimal" value={s.weight} placeholder={ph ? String(ph.w) : ''} onChange={(e) => setField(i, 'weight', e.target.value)} />
                </label>
                <label>
                  <span className="sr-only">Set {i + 1} reps</span>
                  <input className="set-input" inputMode="numeric" value={s.reps} placeholder={ph ? String(ph.r) : ''} onChange={(e) => setField(i, 'reps', e.target.value)} />
                </label>
                <button type="button" className={`check${s.done ? ' on' : ''}`} aria-label={`Set ${i + 1} done`} aria-pressed={s.done} onClick={() => toggle(i)}>
                  <Icon name="check" size={20} stroke={2.6} />
                </button>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn ghost" style={{ flex: 1, fontSize: 14 }} onClick={() => updateSession(session.id, (x) => x.entries[idx].sets.push({ weight: '', reps: '', done: false }))}>
              + Add set
            </button>
            {entry.sets.length > 1 && !entry.sets[entry.sets.length - 1].done && (
              <button type="button" className="btn ghost" style={{ flex: 1, fontSize: 14 }} onClick={() => updateSession(session.id, (x) => x.entries[idx].sets.pop())}>
                − Remove set
              </button>
            )}
          </div>
        </div>

      </main>

      <footer className="footer">
        {restBox}
        {!isLast && !rest && (
          <div className="small muted">
            Up next · <span style={{ color: 'var(--text)', fontWeight: 600 }}>{exerciseName(data, entries[idx + 1].exerciseId)}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn" aria-label="Previous exercise" disabled={idx === 0} style={{ width: 56, height: 56, borderRadius: 16, padding: 0, color: idx === 0 ? '#4A4F55' : 'var(--text)' }} onClick={() => goTo(idx - 1)}>
            <Icon name="chevron-left" size={22} stroke={2.2} />
          </button>
          {isLast ? (
            <button type="button" className="btn primary" style={{ flex: 1 }} onClick={finish}>
              Finish workout
            </button>
          ) : (
            <button type="button" className="btn primary" style={{ flex: 1 }} onClick={() => goTo(idx + 1)}>
              Next exercise
              <Icon name="chevron-right" stroke={2.4} />
            </button>
          )}
        </div>
      </footer>

      {endSheet && (
        <Sheet
          label="End workout"
          onClose={() => {
            setEndSheet(false);
            setConfirmDiscard(false);
          }}
        >
          <h2 className="h2" style={{ fontSize: 22 }}>
            End workout?
          </h2>
          <button type="button" className="btn primary" onClick={finish}>
            Finish and save
          </button>
          <button type="button" className="btn" onClick={() => go({ name: 'tab', tab: 'today' })}>
            Leave for now (keeps running)
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (!confirmDiscard) return setConfirmDiscard(true);
              discardSession(session.id);
              go({ name: 'tab', tab: 'today' });
            }}
          >
            {confirmDiscard ? 'Tap again to discard everything' : 'Discard workout'}
          </button>
        </Sheet>
      )}
    </>
  );
}
