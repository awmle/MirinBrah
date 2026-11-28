import { useEffect, useRef, useState } from 'react';
import { useData } from '../store';
import { AutoTextarea, Icon, Sheet } from '../components';
import type { Go } from '../routes';
import { bestE1rm, doneSessions, exerciseName, exerciseNotes, fmtSet, lastEntryFor, num, sessionDuration, type SetNum, type NoteItem } from '../logic';
import { clock, mediumDate, mmss } from '../dates';
import { discardSession, finishSession, updateExerciseNote, updateSession } from '../actions';
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

        <ExerciseNotes key={entry.id} note={entry.note} history={exerciseNotes(data, entry.exerciseId, session)} exerciseName={name} onSave={(note) => updateExerciseNote(session.id, idx, note)} />

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

/**
 * Notes for this exercise: today's note (editable) plus earlier workouts' notes. The latest one shows by default; older ones
 * are in a scrollable list, newest first.
 */
function ExerciseNotes({ note, history, exerciseName, onSave }: { note: string; history: NoteItem[]; exerciseName: string; onSave: (note: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const [showOlder, setShowOlder] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const save = () => {
    const next = draft.trim();
    if (next !== note) onSave(next);
    setDraft(next);
    setEditing(false);
  };

  const today = note.trim();
  const latest: NoteItem | null = today ? null : history[0] ?? null;
  const older = today ? history : history.slice(1);
  const label = (n: NoteItem) => (n.date ? mediumDate(n.date) + (n.deload ? " · deload" : "") : "Earlier routine note");

  return (
    <section aria-label={`Notes for ${exerciseName}`} style={{ background: "var(--surface)", borderRadius: 14, overflow: "hidden", minWidth: 0 }}>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
          <label htmlFor="exercise-note" className="small muted" style={{ fontWeight: 600 }}>
            Today's note for {exerciseName}
          </label>
          <AutoTextarea id="exercise-note" inputRef={ref} className="text-input" rows={2} maxRows={8} value={draft} placeholder="How it felt, cues, setup, seat height…" onChange={(e) => setDraft(e.target.value)} style={{ fontSize: 15 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn small"
              style={{ flex: 1, height: 40 }}
              onClick={() => {
                setDraft(note);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn small" style={{ flex: 2, height: 40, background: "var(--accent)", color: "var(--accent-ink)" }} onClick={save}>
              Save note
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} aria-label={today ? `Edit today's note for ${exerciseName}` : `Add a note for ${exerciseName} today`} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px", textAlign: "left", width: "100%", minHeight: 44 }}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, width: "100%" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{today ? "Today" : latest ? `Last note · ${label(latest)}` : "Notes"}</span>
            <span style={{ flex: "none", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600 }}>
              <Icon name="note" size={15} />
              {today ? "Edit" : "Add today's"}
            </span>
          </span>
          <span className="note-text" style={{ fontSize: 14, lineHeight: 1.45, color: today || latest ? "var(--text-2)" : "var(--muted)" }}>
            {today || latest?.text || "No notes yet. Tap to add one for today."}
          </span>
        </button>
      )}

      {older.length > 0 && (
        <>
          <button type="button" aria-expanded={showOlder} onClick={() => setShowOlder(!showOlder)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: 40, padding: "0 14px", borderTop: "1px solid var(--line)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
            <span>
              {showOlder ? "Hide" : "Show"} previous notes ({older.length})
            </span>
            <Icon name={showOlder ? "up" : "down"} size={16} />
          </button>
          {showOlder && (
            <div className="notes-scroll">
              {older.map((n, i) => (
                <div key={(n.sessionId ?? "routine") + i} style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{label(n)}</span>
                  <span className="note-text" style={{ fontSize: 14, lineHeight: 1.45, color: "var(--text-2)" }}>
                    {n.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
