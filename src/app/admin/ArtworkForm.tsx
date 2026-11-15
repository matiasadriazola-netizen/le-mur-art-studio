'use client';
import { useActionState, useState } from 'react';
import { saveArtwork, type FormState } from './actions';
import { CLP } from '@/lib/format';

export type ArtworkInput = {
  id?: string; type: 'RIFA' | 'VENTA'; title: string; artist: string; technique: string; size: string; value: number | null;
  description: string; price: number; totalTickets: number; endsAt: string; policy: string; imageUrl: string | null; soldOrHeld: number;
};

const TECH = ['Óleo sobre tela', 'Acrílico sobre tela', 'Acuarela sobre papel', 'Técnica mixta', 'Fotografía', 'Grabado', 'Óleo sobre madera'];

export default function ArtworkForm({ initial }: { initial: ArtworkInput }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveArtwork, {});
  const [type, setType] = useState(initial.type);
  const [tickets, setTickets] = useState(initial.totalTickets), [tprice, setTprice] = useState(initial.price), [value, setValue] = useState(initial.value ?? 0);
  const [preview, setPreview] = useState<string | null>(initial.imageUrl);
  const editing = !!initial.id, locked = initial.soldOrHeld > 0;
  const techs = TECH.includes(initial.technique) || !initial.technique ? TECH : [initial.technique, ...TECH];
  return (
    <form className="panel pub" action={action}>
      <div className="formside">
        <div><h2 style={{ fontSize: 28 }}>{editing ? 'Editar cuadro' : 'Publicar un cuadro'}</h2>
          {locked && <p className="edit-banner" style={{ marginTop: 10 }}>Ya tiene {initial.soldOrHeld} tickets vendidos o reservados: puedes subir la cantidad o mover el cierre, pero no bajar de {initial.soldOrHeld} ni cambiar el precio.</p>}</div>
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="type" value={type} />
        {!editing && (
          <div className="seg" role="group" aria-label="Tipo de venta">
            <button type="button" aria-pressed={type === 'RIFA'} onClick={() => setType('RIFA')}>Sorteo por ticket</button>
            <button type="button" aria-pressed={type === 'VENTA'} onClick={() => setType('VENTA')}>Venta directa</button>
          </div>
        )}
        <div className="form">
          <label className="full">Título de la obra<input name="title" defaultValue={initial.title} maxLength={80} placeholder="Ej: Atardecer en Chiloé" /></label>
          <label>Artista<input name="artist" defaultValue={initial.artist} placeholder="Ej: Camila Rojas" /></label>
          <label>Técnica<select name="technique" defaultValue={initial.technique || TECH[0]}>{techs.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Medidas<input name="size" defaultValue={initial.size} placeholder="Ej: 60 × 80 cm" /></label>
          <label>Valor referencial (CLP)<input name="value" inputMode="numeric" defaultValue={initial.value ?? ''} onChange={(e) => setValue(+e.target.value.replace(/\D/g, '') || 0)} placeholder="Ej: 350000" /></label>
          <div className="full field">Foto del cuadro <span className="hint">JPG, PNG o WEBP de hasta 8 MB. Idealmente de frente y bien iluminada.</span>
            <div className="drop"><input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} /></div></div>
          <label className="full">Descripción (opcional)<textarea name="description" defaultValue={initial.description} placeholder="Cuenta algo de la obra o del artista" /></label>
        </div>
        {type === 'RIFA' ? (
          <div className="form">
            <label>Cantidad de tickets<input name="totalTickets" inputMode="numeric" defaultValue={initial.totalTickets} onChange={(e) => setTickets(+e.target.value.replace(/\D/g, '') || 0)} /></label>
            <label>Precio por ticket (CLP)<input name="price" inputMode="numeric" defaultValue={initial.price} disabled={locked} onChange={(e) => setTprice(+e.target.value.replace(/\D/g, '') || 0)} /></label>
            <label>Cierre de venta de tickets (hora de Chile)<input name="endsAt" type="datetime-local" defaultValue={initial.endsAt} /></label>
            <label>Si no se completa a tiempo<select name="policy" defaultValue={initial.policy}><option value="DRAW">Sortear entre los vendidos</option><option value="EXTEND">Extender 7 días</option><option value="CANCEL">Cancelar y reembolsar</option></select></label>
            <div className="full calc"><span>Recaudación al completar: <b>{CLP(tickets * tprice)}</b></span>{value > 0 && <span>{tickets * tprice >= value ? 'Cubre' : 'No cubre'} el valor referencial ({Math.round((tickets * tprice) / value * 100)}%)</span>}</div>
          </div>
        ) : (
          <div className="form"><label>Precio de venta (CLP)<input name="price" inputMode="numeric" defaultValue={initial.price} /></label></div>
        )}
        <p className="err" role="alert">{state.error}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-brand" disabled={pending}>{pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar ahora'}</button>
          <a className="btn btn-line" href="/admin">Cancelar</a>
        </div>
      </div>
      <div className="previewside">
        <span className="lbl">Foto</span>
        {preview ? <img src={preview} alt="" style={{ borderRadius: 14, width: '100%', aspectRatio: '4/5', objectFit: 'cover' }} /> : <div className="empty">Sin foto todavía</div>}
        <p className="muted" style={{ fontSize: 13 }}>{type === 'RIFA' ? 'Al publicar se genera la semilla secreta del sorteo y se muestra su huella en la ficha.' : 'La primera persona que pague se lleva la obra.'}</p>
      </div>
    </form>
  );
}
