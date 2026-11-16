'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { saveArtwork, type FormState } from './actions';
import { CLP } from '@/lib/format';

export type PastDraw = { winnerName: string; winnerNumber: number | ''; ticketsSold: number | ''; drawAt: string; proofUrl: string };
export type ArtworkInput = {
  id?: string; type: 'RIFA' | 'VENTA' | 'PASADO'; past?: PastDraw; frame?: string; frameOptions?: { name: string; extra: number }[]; categories?: string[]; title: string; artist: string; technique: string; size: string; value: number | null;
  description: string; price: number; totalTickets: number; endsAt: string; policy: string; photos: string[]; soldOrHeld: number;
};

const MAX_PHOTOS = 12;
type Photo = { key: string; src: string; token: string; file?: File };

/** Reduce la foto a 2000 px como máximo antes de subirla (más rápido y liviano). */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (s === 1 && file.size < 1.5e6) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

export default function ArtworkForm({ initial, techniques, frames, categories = [] }: { initial: ArtworkInput; techniques: string[]; frames: string[]; categories?: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveArtwork, {});
  const [type, setType] = useState(initial.type);
  const [tickets, setTickets] = useState(initial.totalTickets), [tprice, setTprice] = useState(initial.price), [value, setValue] = useState(initial.value ?? 0);
  const [photos, setPhotos] = useState<Photo[]>(initial.photos.map((u) => ({ key: u, src: u, token: `url:${u}` })));
  const [busy, setBusy] = useState(false);
  const [cats, setCats] = useState<string[]>(initial.categories ?? []);
  const [catList, setCatList] = useState<string[]>(categories);
  const [newCat, setNewCat] = useState('');
  const toggleCat = (c: string) => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const addCat = () => {
    const n = newCat.trim().slice(0, 40); if (!n) return;
    const known = catList.find((c) => c.toLowerCase() === n.toLowerCase()) ?? n;
    if (!catList.includes(known)) setCatList((l) => [...l, known].sort((a, b) => a.localeCompare(b, 'es')));
    setCats((s) => (s.includes(known) ? s : [...s, known])); setNewCat('');
  };
  const [frameOpts, setFrameOpts] = useState<{ k: number; name: string; extra: string }[]>(
    (initial.frameOptions ?? []).map((o, k) => ({ k, name: o.name, extra: o.extra ? String(o.extra) : '' })));
  const addFrame = () => setFrameOpts((f) => [...f, { k: Date.now(), name: '', extra: '' }]);
  const setFrame = (k: number, patch: Partial<{ name: string; extra: string }>) => setFrameOpts((f) => f.map((o) => (o.k === k ? { ...o, ...patch } : o)));
  const fileInput = useRef<HTMLInputElement>(null);
  const editing = !!initial.id, locked = initial.soldOrHeld > 0;

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const room = MAX_PHOTOS - photos.length;
    const files = await Promise.all([...list].slice(0, Math.max(0, room)).map(shrink));
    setPhotos((p) => [...p, ...files.map((f, i) => ({ key: `n${Date.now()}-${i}`, src: URL.createObjectURL(f), token: '', file: f }))]);
    setBusy(false);
    if (fileInput.current) fileInput.current.value = '';
  }
  const move = (i: number, d: number) => setPhotos((p) => { const c = [...p]; const j = i + d; if (j < 0 || j >= c.length) return p; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const cover = (i: number) => setPhotos((p) => [p[i], ...p.filter((_, k) => k !== i)]);
  const remove = (i: number) => setPhotos((p) => p.filter((_, k) => k !== i));

  // Al enviar: las fotos nuevas viajan como archivos "images" y el orden en "photoOrder"
  function submit(fd: FormData) {
    fd.delete('images');
    let n = 0;
    const order = photos.map((ph) => { if (ph.file) { fd.append('images', ph.file); return `new:${n++}`; } return ph.token; });
    fd.set('photoOrder', JSON.stringify(order));
    return action(fd);
  }
  useEffect(() => () => photos.forEach((p) => p.file && URL.revokeObjectURL(p.src)), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form className="panel pub" action={submit}>
      <div className="formside">
        <div><h2 style={{ fontSize: 28 }}>{editing ? 'Editar cuadro' : 'Publicar un cuadro'}</h2>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Solo el título y el precio son obligatorios.</p>
          {locked && <p className="edit-banner" style={{ marginTop: 10 }}>Ya tiene {initial.soldOrHeld} tickets vendidos o reservados: puedes subir la cantidad o mover el cierre, pero no bajar de {initial.soldOrHeld} ni cambiar el precio.</p>}</div>
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="type" value={type} />
        {!editing && (
          <div className="seg" role="group" aria-label="Tipo de publicación">
            <button type="button" aria-pressed={type === 'RIFA'} onClick={() => setType('RIFA')}>Remate por ticket</button>
            <button type="button" aria-pressed={type === 'VENTA'} onClick={() => setType('VENTA')}>Venta directa</button>
            <button type="button" aria-pressed={type === 'PASADO'} onClick={() => setType('PASADO')}>Remate ya realizado</button>
          </div>
        )}
        <div className="form">
          <label className="full">Título de la obra *<input name="title" defaultValue={initial.title} maxLength={80} placeholder="Ej: Atardecer en Chiloé" required /></label>
          <label>Artista (opcional)<input name="artist" defaultValue={initial.artist} placeholder="Ej: Camila Rojas" /></label>
          <label>Tipo de cuadro (opcional)
            <input name="technique" list="techniques" defaultValue={initial.technique} placeholder="Elige o escribe uno nuevo" maxLength={60} />
            <datalist id="techniques">{techniques.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          {type !== 'VENTA' && (
            <label>Tipo de marco (opcional)
              <input name="frame" list="frames" defaultValue={initial.frame ?? ''} placeholder="Elige o escribe uno nuevo" maxLength={60} />
            </label>
          )}
          <datalist id="frames">{frames.map((t) => <option key={t} value={t} />)}</datalist>
          <label>Medidas (opcional)<input name="size" defaultValue={initial.size} placeholder="Ej: 60 × 80 cm" /></label>
          <label>Valor referencial (opcional, CLP)<input name="value" inputMode="numeric" defaultValue={initial.value ?? ''} onChange={(e) => setValue(+e.target.value.replace(/\D/g, '') || 0)} placeholder="Ej: 350000" /></label>
          <div className="full field">Categorías (opcional) <span className="hint">Ayudan a los visitantes a filtrar. Marca una o varias, o crea una nueva.</span>
            <input type="hidden" name="categories" value={JSON.stringify(cats)} />
            <div className="chips" style={{ marginTop: 6 }}>
              {catList.map((c) => <button type="button" key={c} className="chip" aria-pressed={cats.includes(c)} onClick={() => toggleCat(c)}>{cats.includes(c) ? '✓ ' : ''}{c}</button>)}
              {!catList.length && <span className="muted" style={{ fontSize: 13 }}>Todavía no hay categorías: crea la primera.</span>}
            </div>
            <div className="frame-row" style={{ gridTemplateColumns: '1fr auto', marginTop: 8 }}>
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }} placeholder="Nueva categoría, ej: Paisaje" maxLength={40} aria-label="Nueva categoría" />
              <button type="button" className="btn btn-line btn-sm" onClick={addCat}>+ Agregar</button>
            </div>
          </div>
          <label className="full">Descripción (opcional)<textarea name="description" defaultValue={initial.description} placeholder="Cuenta algo de la obra o del artista" /></label>
        </div>

        <div className="field">Fotos ({photos.length}/{MAX_PHOTOS}) <span className="hint">La primera es la principal: se ve en la portada y en las tarjetas. Usa las flechas para ordenar.</span>
          <div className="photos">
            {photos.map((p, i) => (
              <div className={`ph${i === 0 ? ' main' : ''}`} key={p.key}>
                <img src={p.src} alt={`Foto ${i + 1}`} />
                {i === 0 ? <span className="badge">Principal</span> : <button type="button" className="badge as-btn" onClick={() => cover(i)}>Hacer principal</button>}
                <div className="ph-acts">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda">←</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Mover a la derecha">→</button>
                  <button type="button" onClick={() => remove(i)} aria-label="Quitar foto">Quitar</button>
                </div>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="ph add">
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => addFiles(e.target.files)} />
                <span>{busy ? 'Preparando…' : '+ Agregar fotos'}</span>
              </label>
            )}
          </div>
        </div>

        {type === 'PASADO' ? (
          <div className="form">
            <p className="full edit-banner" style={{ margin: 0 }}>Para publicar en Ganadores un remate que hiciste fuera del sitio (por ejemplo en vivo por Instagram). Se mostrará como “remate realizado en vivo”, sin la verificación automática del sitio.</p>
            <label>Nombre del ganador *<input name="winnerName" defaultValue={initial.past?.winnerName ?? ''} placeholder="Ej: Valentina S." maxLength={60} /></label>
            <label>Número ganador *<input name="winnerNumber" inputMode="numeric" defaultValue={initial.past?.winnerNumber ?? ''} placeholder="Ej: 17" /></label>
            <label>Cantidad de tickets del remate *<input name="totalTickets" inputMode="numeric" defaultValue={initial.totalTickets} /></label>
            <label>Tickets vendidos (opcional)<input name="ticketsSold" inputMode="numeric" defaultValue={initial.past?.ticketsSold ?? ''} placeholder="Si se vendieron todos, déjalo vacío" /></label>
            <label>Precio por ticket (opcional, CLP)<input name="price" inputMode="numeric" defaultValue={initial.price || ''} /></label>
            <label>Fecha del remate (hora de Chile) *<input name="drawAt" type="datetime-local" defaultValue={initial.past?.drawAt ?? ''} /></label>
            <label className="full">Enlace de respaldo (opcional)<input name="proofUrl" type="url" defaultValue={initial.past?.proofUrl ?? ''} placeholder="https://www.instagram.com/p/… (video o post del remate)" /></label>
          </div>
        ) : type === 'RIFA' ? (
          <div className="form">
            <label>Cantidad de tickets *<input name="totalTickets" inputMode="numeric" defaultValue={initial.totalTickets} onChange={(e) => setTickets(+e.target.value.replace(/\D/g, '') || 0)} /></label>
            <label>Precio por ticket (CLP) *<input name="price" inputMode="numeric" defaultValue={initial.price} disabled={locked} onChange={(e) => setTprice(+e.target.value.replace(/\D/g, '') || 0)} /></label>
            <label>Cierre de venta de tickets (hora de Chile) *<input name="endsAt" type="datetime-local" defaultValue={initial.endsAt} /></label>
            <label>Si no se completa a tiempo<select name="policy" defaultValue={initial.policy}><option value="DRAW">Elegir ganador entre los vendidos</option><option value="EXTEND">Extender 7 días</option><option value="CANCEL">Cancelar y reembolsar</option></select></label>
            <div className="full calc"><span>Recaudación al completar: <b>{CLP(tickets * tprice)}</b></span>{value > 0 && <span>{tickets * tprice >= value ? 'Cubre' : 'No cubre'} el valor referencial ({Math.round((tickets * tprice) / value * 100)}%)</span>}</div>
          </div>
        ) : (
          <div className="form">
            <label>Precio de venta (CLP) *<input name="price" inputMode="numeric" defaultValue={initial.price} /></label>
            <div className="full field">Marcos que puede elegir el comprador (opcional)
              <span className="hint">Si agregas opciones, el comprador elige una al pagar y su precio adicional se suma al total. Pon $0 en la que va incluida. Si no agregas ninguna, no se pregunta.</span>
              <input type="hidden" name="frameOptions" value={JSON.stringify(frameOpts.map((o) => ({ name: o.name, extra: +o.extra.replace(/\D/g, '') || 0 })))} />
              <div className="frame-rows">
                {frameOpts.map((o) => (
                  <div className="frame-row" key={o.k}>
                    <input list="frames" value={o.name} onChange={(e) => setFrame(o.k, { name: e.target.value })} placeholder="Ej: Marco de madera natural" maxLength={60} aria-label="Nombre del marco" />
                    <input inputMode="numeric" value={o.extra} onChange={(e) => setFrame(o.k, { extra: e.target.value })} placeholder="+ $0" aria-label="Precio adicional del marco" />
                    <button type="button" className="btn btn-line btn-sm" onClick={() => setFrameOpts((f) => f.filter((x) => x.k !== o.k))}>Quitar</button>
                  </div>
                ))}
                {frameOpts.length < 10 && <button type="button" className="btn btn-line btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addFrame}>+ Agregar opción de marco</button>}
              </div>
            </div>
          </div>
        )}
        <p className="err" role="alert">{state.error}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-brand" disabled={pending || busy}>{pending ? 'Guardando…' : editing ? 'Guardar cambios' : type === 'PASADO' ? 'Publicar en Ganadores' : 'Publicar ahora'}</button>
          <a className="btn btn-line" href="/admin">Cancelar</a>
        </div>
      </div>
      <div className="previewside">
        <span className="lbl">Foto principal</span>
        {photos[0] ? <img src={photos[0].src} alt="" style={{ borderRadius: 14, width: '100%', aspectRatio: '4/5', objectFit: 'cover' }} /> : <div className="empty">Sin fotos todavía</div>}
        <p className="muted" style={{ fontSize: 13 }}>{type === 'RIFA' ? 'Al publicar se genera la semilla secreta del remate y se muestra su huella en la ficha.' : type === 'PASADO' ? 'Aparecerá en Ganadores y en la portada con el nombre y número del ganador.' : 'La primera persona que pague se lleva la obra.'}</p>
      </div>
    </form>
  );
}
