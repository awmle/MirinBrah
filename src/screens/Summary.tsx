import { useState } from 'react';
import { useData } from '../store';
import { ConfirmSheet, Icon } from '../components';
import type { Go, Route } from '../routes';
import { compareEntries, exerciseName, fmtSet, fmtSets, fmtVolume, lastEntryFor, sessionDoneSetCount, sessionDuration, sessionPRs, sessionVolume } from '../logic';
import { clock, mediumDate } from '../dates';
import { deleteSession, updateSession } from '../actions';

export function Summary({ sessionId, justFinished, back, go }: { sessionId: string; justFinished?: boolean; back?: Route; go: Go }) {
  const data = useData();
  const session = data.sessions.find((s) => s.id === sessionId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const leave = () => go(back ?? { name: 'tab', tab: 'today' });

  if (!session) {
    return (
      <main className="scroll">
        <p className="muted">This workout was deleted.</p>
        <button type="button" className="btn" onClick={leave}>
          Back
        </button>
      </main>
    );
  }

  const prs = sessionPRs(data, session);
  const rows = session.entries.map((e) => {
    const prev = lastEntryFor(data, e.exerciseId, session);
    return { id: e.id, name: exerciseName(data, e.exerciseId), sets: fmtSets(e), delta: compareEntries(e, prev?.entry ?? null) };
  });

  return (
    <>
      {!justFinished && (
        <header className="topbar">
          <button type="button" className="link-btn" onClick={leave}>
            <Icon name="chevron-left" stroke={2.2} />
            Back
          </button>
        </header>
      )}
      <main className={`scroll${justFinished ? '' : ' with-header'}`} style={{ gap: 20, paddingTop: justFinished ? 'calc(var(--safe-top) + 40px)' : undefined }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          {justFinished && (
            <span style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={32} stroke={2.6} />
            </span>
          )}
          <h1 className="h1" style={{ fontSize: 28 }}>
            {session.dayName} {justFinished ? 'done' : ''}
          </h1>
          <span className="muted" style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            {mediumDate(session.date)}
            {session.deload && <span className="tag deload">DELOAD</span>}
          </span>
        </div>

        <div className="tiles">
          <div className="tile">
            <span className="tile-label">Duration</span>
            <span className="tile-value">{clock(sessionDuration(session))}</span>
          </div>
          <div className="tile">
            <span className="tile-label">Volume (lb)</span>
            <span className="tile-value">{fmtVolume(sessionVolume(session))}</span>
          </div>
          <div className="tile">
            <span className="tile-label">Sets</span>
            <span className="tile-value">{sessionDoneSetCount(session)}</span>
          </div>
        </div>

        {prs.map((pr) => (
          <div key={pr.exerciseId} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--accent-soft)', borderRadius: 14, padding: '14px 16px' }}>
            <span style={{ color: 'var(--accent)', flex: 'none' }}>
              <Icon name="trophy" size={22} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-pale)' }}>New PR · {exerciseName(data, pr.exerciseId)}</span>
              <span style={{ fontSize: 13, color: 'var(--accent-text)' }}>
                {fmtSet(pr.set)} lb (best was {fmtSet(pr.prev)})
              </span>
            </span>
          </div>
        ))}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="eyebrow">Vs last time</h2>
          <div className="list">
            {rows.map((r) => (
              <div key={r.id} className="row">
                <span className="row-main">
                  <span className="row-title">{r.name}</span>
                  <span className="row-sub">{r.sets}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: r.delta.up ? 'var(--accent)' : 'var(--muted)', flex: 'none' }}>{r.delta.text}</span>
              </div>
            ))}
          </div>
        </section>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="eyebrow">Session note</span>
          <textarea className="text-input" rows={2} style={{ background: 'var(--surface)' }} placeholder="How did it feel? Sleep, energy, pain…" value={session.note} onChange={(e) => updateSession(session.id, (s) => (s.note = e.target.value))} />
        </label>

        {!justFinished && (
          <button type="button" className="btn ghost danger" onClick={() => setConfirmDelete(true)}>
            Delete this workout
          </button>
        )}
      </main>
      {justFinished && (
        <footer className="footer">
          <button type="button" className="btn primary" onClick={() => go({ name: 'tab', tab: 'today' })}>
            Save &amp; close
          </button>
        </footer>
      )}
      {confirmDelete && (
        <ConfirmSheet
          title="Delete this workout?"
          body="Its sets are removed from your history and progress charts. This can't be undone."
          confirmLabel="Delete"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteSession(session.id);
            leave();
          }}
        />
      )}
    </>
  );
}
