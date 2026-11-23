import { useEffect, useRef, useState } from 'react';
import { useData } from '../store';
import { ConfirmSheet, Icon, Sheet } from '../components';
import type { Go } from '../routes';
import type { Routine } from '../types';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../dates';
import { exerciseName } from '../logic';
import { assignDay, createRoutine, deleteRoutine, renameRoutine, setActiveRoutine } from '../actions';

export function TextSheet({ title, label, initial = '', placeholder, confirmLabel, onConfirm, onClose }: { title: string; label: string; initial?: string; placeholder?: string; confirmLabel: string; onConfirm: (v: string) => void; onClose: () => void }) {
  const [v, setV] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(t);
  }, []);
  const submit = () => v.trim() && onConfirm(v.trim());
  return (
    <Sheet label={title} onClose={onClose}>
      <h2 className="h2" style={{ fontSize: 22 }}>
        {title}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <label htmlFor="text-sheet" className="small muted" style={{ fontWeight: 600 }}>
          {label}
        </label>
        <input id="text-sheet" ref={inputRef} className="text-input" value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} autoCapitalize="words" enterKeyHint="done" />
      </form>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn primary" style={{ flex: 2, height: 52 }} disabled={!v.trim()} onClick={submit}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

type SheetState = { kind: 'new' } | { kind: 'options'; routine: Routine } | { kind: 'rename'; routine: Routine } | { kind: 'delete'; routine: Routine } | { kind: 'assign'; routine: Routine; day: number } | null;

export function Routines({ go }: { go: Go }) {
  const data = useData();
  const [sheet, setSheet] = useState<SheetState>(null);
  const active = data.routines.find((r) => r.id === data.activeRoutineId) ?? null;
  const others = data.routines.filter((r) => r.id !== active?.id);
  const close = () => setSheet(null);

  return (
    <>
      <main className="scroll">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h1 className="h1">Routines</h1>
          <button type="button" className="icon-btn" aria-label="New routine" style={{ background: 'var(--surface-2)', borderRadius: 22, color: 'var(--accent)' }} onClick={() => setSheet({ kind: 'new' })}>
            <Icon name="plus" size={22} />
          </button>
        </div>

        {!active && (
          <section className="card">
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              No routines yet. A routine is your weekly plan: each weekday gets a workout or a rest day.
            </p>
            <button type="button" className="btn primary" onClick={() => setSheet({ kind: 'new' })}>
              Create a routine
            </button>
          </section>
        )}

        {active && (
          <section className="card" style={{ border: '1px solid #3A4A1A', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span className="tag accent" style={{ alignSelf: 'flex-start' }}>
                  ACTIVE
                </span>
                <h2 className="h2" style={{ fontSize: 22, marginTop: 6 }}>
                  {active.name}
                </h2>
                <span className="small muted">{active.days.filter(Boolean).length} training days</span>
              </div>
              <button type="button" className="icon-btn" aria-label="Routine options" onClick={() => setSheet({ kind: 'options', routine: active })}>
                <Icon name="more" size={22} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {active.days.map((p, i) =>
                p ? (
                  <button key={i} type="button" onClick={() => go({ name: 'editDay', routineId: active.id, day: i })} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', borderRadius: 14, padding: '10px 12px', minHeight: 52, textAlign: 'left' }}>
                    <span style={{ width: 40, fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{WEEKDAYS_SHORT[i]}</span>
                    <span className="row-main">
                      <span className="row-title">{p.name}</span>
                      <span className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.items.length ? `${p.items.length} exercise${p.items.length === 1 ? '' : 's'} · ${p.items.map((it) => exerciseName(data, it.exerciseId)).join(', ')}` : 'No exercises yet'}
                      </span>
                    </span>
                    <span className="muted">
                      <Icon name="chevron-right" size={18} />
                    </span>
                  </button>
                ) : (
                  <button key={i} type="button" onClick={() => setSheet({ kind: 'assign', routine: active, day: i })} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px dashed var(--line-2)', borderRadius: 14, padding: '10px 12px', minHeight: 48, color: 'var(--muted)', textAlign: 'left' }}>
                    <span style={{ width: 40, fontSize: 13, fontWeight: 700 }}>{WEEKDAYS_SHORT[i]}</span>
                    <span style={{ flex: 1, fontSize: 15 }}>Rest day</span>
                    <span style={{ fontSize: 12 }}>Assign workout</span>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 className="eyebrow">Other routines</h3>
            <div className="list">
              {others.map((r) => (
                <div key={r.id} className="row">
                  <span className="row-main">
                    <span className="row-title">{r.name}</span>
                    <span className="row-sub">
                      {r.days
                        .map((p, i) => (p ? WEEKDAYS_SHORT[i] : null))
                        .filter(Boolean)
                        .join(' · ') || 'No training days'}
                    </span>
                  </span>
                  <button type="button" className="btn small" onClick={() => setActiveRoutine(r.id)}>
                    Make active
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Options for ${r.name}`} onClick={() => setSheet({ kind: 'options', routine: r })}>
                    <Icon name="more" size={20} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {sheet?.kind === 'new' && (
        <TextSheet
          title="New routine"
          label="Routine name"
          placeholder="e.g. PPL + Upper/Lower"
          confirmLabel="Create"
          onClose={close}
          onConfirm={(name) => {
            const id = createRoutine(name);
            if (!data.activeRoutineId) setActiveRoutine(id);
            close();
          }}
        />
      )}
      {sheet?.kind === 'options' && (
        <Sheet label={`${sheet.routine.name} options`} onClose={close}>
          <h2 className="h2" style={{ fontSize: 22 }}>
            {sheet.routine.name}
          </h2>
          <button type="button" className="btn" onClick={() => setSheet({ kind: 'rename', routine: sheet.routine })}>
            Rename
          </button>
          <button type="button" className="btn danger" onClick={() => setSheet({ kind: 'delete', routine: sheet.routine })}>
            Delete routine
          </button>
        </Sheet>
      )}
      {sheet?.kind === 'rename' && (
        <TextSheet
          title="Rename routine"
          label="Routine name"
          initial={sheet.routine.name}
          confirmLabel="Save"
          onClose={close}
          onConfirm={(name) => {
            renameRoutine(sheet.routine.id, name);
            close();
          }}
        />
      )}
      {sheet?.kind === 'delete' && (
        <ConfirmSheet
          title={`Delete ${sheet.routine.name}?`}
          body="The weekly plan is removed. Workouts you've already logged and all exercise history are kept."
          confirmLabel="Delete"
          danger
          onClose={close}
          onConfirm={() => {
            deleteRoutine(sheet.routine.id);
            close();
          }}
        />
      )}
      {sheet?.kind === 'assign' && (
        <TextSheet
          title={`${WEEKDAYS[sheet.day]} workout`}
          label="Workout name"
          placeholder="e.g. Push"
          confirmLabel="Create"
          onClose={close}
          onConfirm={(name) => {
            assignDay(sheet.routine.id, sheet.day, name);
            close();
            go({ name: 'editDay', routineId: sheet.routine.id, day: sheet.day });
          }}
        />
      )}
    </>
  );
}
