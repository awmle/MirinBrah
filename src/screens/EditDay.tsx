import { useState } from 'react';
import { showToast } from '../toast';
import { useData } from '../store';
import { ConfirmSheet, ExerciseNameSheet, Icon, Sheet } from '../components';
import type { Go } from '../routes';
import type { PlanItem } from '../types';
import { WEEKDAYS, mmss, parseRest, restMask } from '../dates';
import { defaultDeloadSets, exerciseName } from '../logic';
import { addItem, clearDeloadOverride, makeRestDay, moveItem, removeItem, renameDay, replaceItemExercise, updateItem } from '../actions';
import { TextSheet } from './Routines';

type SheetState = { kind: 'add' } | { kind: 'replace'; item: PlanItem } | { kind: 'more'; item: PlanItem; index: number } | { kind: 'remove'; item: PlanItem } | { kind: 'rename' } | { kind: 'rest' } | null;

export function EditDay({ routineId, day, go }: { routineId: string; day: number; go: Go }) {
  const data = useData();
  const [sheet, setSheet] = useState<SheetState>(null);
  const routine = data.routines.find((r) => r.id === routineId);
  const plan = routine?.days[day];
  const [snapshot] = useState(() => JSON.stringify(plan ?? null));
  const changed = JSON.stringify(plan ?? null) !== snapshot;
  const back = () => {
    if (changed) showToast('Routine updated');
    go({ name: 'tab', tab: 'routines' });
  };
  const done = () => {
    showToast(changed ? 'Routine updated' : 'Saved');
    go({ name: 'tab', tab: 'routines' });
  };
  const close = () => setSheet(null);

  if (!routine || !plan) {
    return (
      <main className="scroll">
        <p className="muted">This day no longer exists.</p>
        <button type="button" className="btn" onClick={back}>
          Back to routines
        </button>
      </main>
    );
  }

  return (
    <>
      <header className="topbar">
        <button type="button" className="link-btn" onClick={back}>
          <Icon name="chevron-left" stroke={2.2} />
          Routine
        </button>
        <button type="button" className="link-btn strong" onClick={done}>
          Done
        </button>
      </header>
      <main className="scroll with-header" style={{ gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="small muted">Every {WEEKDAYS[day]}</span>
          <button type="button" onClick={() => setSheet({ kind: 'rename' })} style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }} aria-label={`Rename ${plan.name}`}>
            <h1 className="h1" style={{ fontSize: 30 }}>
              {plan.name}
            </h1>
            <span className="muted">
              <Icon name="note" size={18} />
            </span>
          </button>
        </div>

        {plan.items.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 14 }}>No exercises yet. Add your first one below.</p>}

        {plan.items.map((it, i) => (
          <ItemCard key={it.id} item={it} name={exerciseName(data, it.exerciseId)} routineId={routineId} day={day} onReplace={() => setSheet({ kind: 'replace', item: it })} onMore={() => setSheet({ kind: 'more', item: it, index: i })} />
        ))}

        <button type="button" className="btn dashed" onClick={() => setSheet({ kind: 'add' })}>
          + Add exercise
        </button>
        <button type="button" className="btn ghost" onClick={() => setSheet({ kind: 'rest' })}>
          Make {WEEKDAYS[day]} a rest day
        </button>
      </main>

      {sheet?.kind === 'add' && (
        <ExerciseNameSheet
          title="Add exercise"
          subtitle={`Every ${WEEKDAYS[day]} · ${plan.name}`}
          confirmLabel="Add"
          onClose={close}
          onConfirm={(name) => {
            addItem(routineId, day, name);
            close();
          }}
        />
      )}
      {sheet?.kind === 'replace' && (
        <ExerciseNameSheet
          title={`Replace ${exerciseName(data, sheet.item.exerciseId)}`}
          subtitle={`Every ${WEEKDAYS[day]} · ${plan.name}`}
          confirmLabel="Replace"
          info={
            <>
              {exerciseName(data, sheet.item.exerciseId)} keeps all its history under Progress. The new exercise keeps the same sets, reps, rest and note, and its own history starts with its first session (or continues, if you've done it before). {plan.name}'s
              total volume chart carries on as normal.
            </>
          }
          onClose={close}
          onConfirm={(name) => {
            replaceItemExercise(routineId, day, sheet.item.id, name);
            close();
          }}
        />
      )}
      {sheet?.kind === 'more' && (
        <Sheet label="Exercise options" onClose={close}>
          <h2 className="h2" style={{ fontSize: 22 }}>
            {exerciseName(data, sheet.item.exerciseId)}
          </h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              disabled={sheet.index === 0}
              onClick={() => {
                moveItem(routineId, day, sheet.item.id, -1);
                close();
              }}
            >
              <Icon name="up" /> Move up
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              disabled={sheet.index === plan.items.length - 1}
              onClick={() => {
                moveItem(routineId, day, sheet.item.id, 1);
                close();
              }}
            >
              <Icon name="down" /> Move down
            </button>
          </div>
          <button type="button" className="btn danger" onClick={() => setSheet({ kind: 'remove', item: sheet.item })}>
            Remove from {plan.name}
          </button>
        </Sheet>
      )}
      {sheet?.kind === 'remove' && (
        <ConfirmSheet
          title={`Remove ${exerciseName(data, sheet.item.exerciseId)}?`}
          body="It's taken off this day. Its logged history stays under Progress."
          confirmLabel="Remove"
          danger
          onClose={close}
          onConfirm={() => {
            removeItem(routineId, day, sheet.item.id);
            close();
          }}
        />
      )}
      {sheet?.kind === 'rename' && (
        <TextSheet
          title="Rename workout"
          label="Workout name"
          initial={plan.name}
          confirmLabel="Save"
          onClose={close}
          onConfirm={(name) => {
            renameDay(routineId, day, name);
            close();
          }}
        />
      )}
      {sheet?.kind === 'rest' && (
        <ConfirmSheet
          title={`Make ${WEEKDAYS[day]} a rest day?`}
          body={`${plan.name} and its exercise list are removed from this routine. Logged workouts and history are kept.`}
          confirmLabel="Make rest day"
          danger
          onClose={close}
          onConfirm={() => {
            makeRestDay(routineId, day);
            back();
          }}
        />
      )}
    </>
  );
}

function ItemCard({ item, name, routineId, day, onReplace, onMore }: { item: PlanItem; name: string; routineId: string; day: number; onReplace: () => void; onMore: () => void }) {
  const [sets, setSets] = useState(String(item.sets));
  const [reps, setReps] = useState(item.reps);
  const [rest, setRest] = useState(mmss(item.restSec));
  const [deload, setDeload] = useState(item.deloadSets !== undefined ? String(item.deloadSets) : '');
  const [note, setNote] = useState(item.note);
  const id = item.id;

  return (
    <article className="card" style={{ padding: 16, gap: 12, borderRadius: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 600, minWidth: 0 }}>{name}</h2>
        <button type="button" className="btn small" onClick={onReplace}>
          <Icon name="swap" size={14} stroke={2.2} />
          Replace
        </button>
        <button type="button" className="icon-btn" aria-label={`More options for ${name}`} onClick={onMore} style={{ marginRight: -10 }}>
          <Icon name="more" size={20} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <label className="field">
          <span className="field-label">SETS</span>
          <input
            inputMode="numeric"
            value={sets}
            onChange={(e) => {
              setSets(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (n >= 1 && n <= 20) updateItem(routineId, day, id, { sets: n });
            }}
            onBlur={() => setSets(String(item.sets))}
          />
        </label>
        <label className="field">
          <span className="field-label">REPS</span>
          <input
            value={reps}
            placeholder="8–12"
            onChange={(e) => {
              setReps(e.target.value);
              if (e.target.value.trim()) updateItem(routineId, day, id, { reps: e.target.value.trim() });
            }}
            onBlur={() => setReps(item.reps)}
          />
        </label>
        <label className="field">
          <span className="field-label">REST</span>
          <input
            inputMode="numeric"
            value={rest}
            placeholder="2:00"
            aria-label={`Rest for ${name}, minutes and seconds`}
            onChange={(e) => {
              const masked = restMask(e.target.value);
              setRest(masked);
              const s = parseRest(masked);
              if (s !== null) updateItem(routineId, day, id, { restSec: s });
            }}
            onBlur={() => setRest(mmss(item.restSec))}
          />
        </label>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 4px 0 12px', minHeight: 44, borderRadius: 12, border: '1px dashed var(--line-2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>DELOAD</span>
          sets on deload weeks
        </span>
        <input
          className="set-input"
          style={{ width: 56, height: 36 }}
          inputMode="numeric"
          value={deload}
          placeholder={String(defaultDeloadSets(item.sets))}
          aria-label={`Deload sets for ${name}`}
          onChange={(e) => {
            setDeload(e.target.value);
            const n = parseInt(e.target.value, 10);
            if (!e.target.value.trim()) clearDeloadOverride(routineId, day, id);
            else if (n >= 1 && n <= 20) updateItem(routineId, day, id, { deloadSets: n });
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <span className="sr-only">Note for {name}</span>
        <textarea
          className="text-input"
          rows={2}
          style={{ background: 'var(--bar)', fontSize: 15, borderRadius: 10 }}
          placeholder="Note (cues, setup, seat height…)"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            updateItem(routineId, day, id, { note: e.target.value });
          }}
        />
      </label>
    </article>
  );
}
