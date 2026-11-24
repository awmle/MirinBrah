import { useEffect, useState, useSyncExternalStore } from 'react';
import { Icon } from './components';

let current: { text: string; id: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows a short confirmation pop-up above the tab bar. */
export function showToast(text: string, ms = 1800): void {
  const id = Date.now() + Math.random();
  current = { text, id };
  emit();
  setTimeout(() => {
    if (current?.id === id) {
      current = null;
      emit();
    }
  }, ms);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function Toast() {
  const msg = useSyncExternalStore(subscribe, () => current);
  const [shown, setShown] = useState(msg);
  useEffect(() => {
    if (msg) setShown(msg);
  }, [msg]);
  if (!shown) return null;
  return (
    <div
      className={`toast${msg ? ' in' : ' out'}`}
      role="status"
      aria-live="polite"
      onAnimationEnd={() => !msg && setShown(null)}
    >
      <span style={{ display: 'inline-flex', width: 24, height: 24, borderRadius: 12, background: 'var(--accent)', color: 'var(--accent-ink)', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name="check" size={16} stroke={2.8} />
      </span>
      <span style={{ fontWeight: 600 }}>{shown.text}</span>
    </div>
  );
}
