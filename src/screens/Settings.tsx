import { useRef, useState } from 'react';
import { emptyData, getData, isValidData, replaceData, useData } from '../store';
import { ConfirmSheet, Icon } from '../components';
import type { Go } from '../routes';
import type { Data } from '../types';
import { dateKey } from '../dates';

export function Settings({ go }: { go: Go }) {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Data | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const back = () => go({ name: 'tab', tab: 'today' });
  const done = data.sessions.filter((s) => s.status === 'done').length;

  const exportBackup = async () => {
    const json = JSON.stringify(getData(), null, 2);
    const name = `mirinbrah-backup-${dateKey(new Date())}.json`;
    const file = new File([json], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'You Mirin Brah backup' });
        setMessage('Backup shared. Save it to Files or iCloud Drive.');
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMessage('Backup downloaded.');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (!isValidData(parsed)) throw new Error('bad');
      setPending(parsed);
    } catch {
      setMessage("That file isn't a You Mirin Brah backup.");
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <header className="topbar">
        <button type="button" className="link-btn" onClick={back}>
          <Icon name="chevron-left" stroke={2.2} />
          Today
        </button>
      </header>
      <main className="scroll with-header">
        <h1 className="h1">Settings</h1>

        <section className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Backup</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              Everything is stored only on this phone ({data.routines.length} routine{data.routines.length === 1 ? '' : 's'}, {done} workout{done === 1 ? '' : 's'}). Export a backup now and then and keep it in Files or iCloud Drive, so you can restore it if
              the app is ever removed.
            </p>
          </div>
          <button type="button" className="btn primary" onClick={exportBackup}>
            Export backup
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Restore from backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          {message && (
            <p role="status" style={{ margin: 0, fontSize: 13, color: 'var(--accent-text)' }}>
              {message}
            </p>
          )}
        </section>

        <section className="card">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Units</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Weights are in pounds (lb).
          </p>
        </section>

        <button type="button" className="btn ghost danger" onClick={() => setConfirmErase(true)}>
          Erase all data
        </button>
      </main>

      {pending && (
        <ConfirmSheet
          title="Restore this backup?"
          body={`It has ${pending.routines.length} routine(s) and ${pending.sessions.filter((s) => s.status === 'done').length} workout(s). Everything currently on this phone is replaced.`}
          confirmLabel="Restore"
          onClose={() => setPending(null)}
          onConfirm={() => {
            replaceData(pending);
            setPending(null);
            setMessage('Backup restored.');
          }}
        />
      )}
      {confirmErase && (
        <ConfirmSheet
          title="Erase all data?"
          body="Every routine, workout and exercise history on this phone is deleted. Export a backup first if you might want it back."
          confirmLabel="Erase"
          danger
          onClose={() => setConfirmErase(false)}
          onConfirm={() => {
            replaceData(emptyData());
            setConfirmErase(false);
            back();
          }}
        />
      )}
    </>
  );
}
