'use client';
import { useState } from 'react';

/** Botón que pide confirmar en la misma pantalla antes de ejecutar una acción del servidor. */
export default function ConfirmAction({ action, id, label, confirm, danger }: {
  action: (fd: FormData) => Promise<void>; id: string; label: string; confirm: string; danger?: boolean;
}) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-line'}`} onClick={() => setAsk(true)}>{label}</button>;
  return (
    <form action={action} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="hidden" name="id" value={id} />
      <span className="muted" style={{ fontSize: 13 }}>{confirm}</span>
      <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-brand'}`}>Sí</button>
      <button type="button" className="btn btn-line btn-sm" onClick={() => setAsk(false)}>No</button>
    </form>
  );
}
