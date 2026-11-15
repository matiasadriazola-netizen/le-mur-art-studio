'use client';
import { useState } from 'react';

export default function Tabs({ tabs, initial }: { tabs: { key: string; label: string; content: React.ReactNode }[]; initial: string }) {
  const [cur, setCur] = useState(initial);
  return (
    <>
      <div className="seg" role="tablist" aria-label="Secciones de la obra">
        {tabs.map((t) => <button key={t.key} type="button" role="tab" aria-selected={cur === t.key} aria-pressed={cur === t.key} onClick={() => setCur(t.key)}>{t.label}</button>)}
      </div>
      {tabs.map((t) => <div key={t.key} className="dpanel" role="tabpanel" hidden={cur !== t.key}>{t.content}</div>)}
    </>
  );
}
