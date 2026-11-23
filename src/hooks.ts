import { useEffect, useState } from 'react';

/** Current time, refreshed every `ms` and whenever the app comes back to the foreground. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms]);
  return now;
}

interface WakeLockLike {
  release: () => Promise<void>;
}

/** Keeps the screen on while mounted (where the browser supports it). */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockLike | null = null;
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockLike> } };
    const acquire = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === 'visible') {
          const l = await nav.wakeLock.request('screen');
          if (cancelled) l.release();
          else lock = l;
        }
      } catch {
        /* not allowed or unsupported */
      }
    };
    acquire();
    const onVis = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, []);
}

let audio: AudioContext | null = null;

/** Must be called from a tap so iOS lets the page play sound later. */
export function unlockAudio(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audio) audio = new Ctx();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    /* no audio */
  }
}

/** Three short beeps. */
export function beep(): void {
  if (!audio) return;
  const t0 = audio.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1320 : 880;
    const t = t0 + i * 0.28;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}
