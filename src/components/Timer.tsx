'use client';
import { useEffect, useState } from 'react';
import { pad } from '@/lib/format';

function parts(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
export function fmtLeft(ms: number) {
  if (ms <= 0) return 'cerrado';
  const t = parts(ms);
  return t.d > 0 ? `${t.d}d ${pad(t.h)}h ${pad(t.m)}m` : `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`;
}

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

/** Pastilla con el tiempo restante (para tarjetas). */
export function TimerPill({ endsAt }: { endsAt: string }) {
  const now = useNow();
  const ms = now === null ? Infinity : Date.parse(endsAt) - now;
  return (
    <span className={`gpill tm${ms < 86_400_000 ? ' urgent' : ''}`} suppressHydrationWarning>
      <svg className="icon" aria-hidden="true"><use href="#i-clock" /></svg>
      <span>{now === null ? '…' : fmtLeft(ms)}</span>
    </span>
  );
}

export function TimerText({ endsAt }: { endsAt: string }) {
  const now = useNow();
  return <b className="mono" style={{ display: 'inline', fontSize: 'inherit' }}>{now === null ? '…' : fmtLeft(Date.parse(endsAt) - now)}</b>;
}

/** Cuenta regresiva grande (ficha de la obra). */
export function Countdown({ endsAt }: { endsAt: string }) {
  const now = useNow();
  const ms = now === null ? 0 : Date.parse(endsAt) - now;
  const t = parts(ms);
  const units: [keyof typeof t, string][] = [['d', 'días'], ['h', 'horas'], ['m', 'min'], ['s', 'seg']];
  return (
    <div className={`cd${now !== null && ms < 86_400_000 ? ' urgent' : ''}`}>
      {units.map(([k, l]) => <div className="u" key={k}><b>{now === null ? '--' : pad(t[k])}</b><span>{l}</span></div>)}
    </div>
  );
}
