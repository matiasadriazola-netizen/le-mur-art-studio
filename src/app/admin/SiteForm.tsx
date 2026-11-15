'use client';
import { useActionState } from 'react';
import { saveSite, type FormState } from './actions';

type S = { name: string; logoUrl: string | null; heroUrl: string | null; showUrl: string | null; title: string; highlight: string; lead: string };

function ImageField({ label, hint, name, current, fallback }: { label: string; hint: string; name: string; current: string | null; fallback?: string }) {
  return (
    <div className="full field">{label} <span className="hint">{hint}</span>
      <div className="drop">
        <span className="current">{current ? <img src={current} alt="" /> : <span className="muted" style={{ fontSize: 13 }}>{fallback ?? 'Sin imagen'}</span>}</span>
        <input name={name} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
        {current && <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><input type="checkbox" name={`clear_${name}`} style={{ width: 'auto' }} />Quitar</label>}
      </div>
    </div>
  );
}

export default function SiteForm({ s }: { s: S }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSite, {});
  return (
    <form className="panel" action={action} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div><h2 style={{ fontSize: 28 }}>Logo y fotos del sitio</h2><p className="muted" style={{ marginTop: 6 }}>Los cambios se ven en el sitio apenas guardas.</p></div>
      <div className="form">
        <label className="full">Nombre del sitio<input name="name" defaultValue={s.name} maxLength={40} /></label>
        <ImageField label="Logo" hint="PNG o SVG con fondo transparente." name="logo" current={s.logoUrl} fallback="Se muestra el nombre" />
        {s.logoUrl !== '/brand/logo-le-mur.png' && <label className="full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input type="checkbox" name="restore_logo" style={{ width: 'auto' }} />Volver al logo original de Le Mur</label>}
        <ImageField label="Foto de portada" hint="Horizontal, de al menos 1600 px de ancho. El lado izquierdo debe ser tranquilo: ahí va el texto." name="hero" current={s.heroUrl} fallback="Se usa la ilustración de ejemplo" />
        <label>Título de portada<input name="title" defaultValue={s.title} maxLength={40} /></label>
        <label>Texto destacado en color<input name="highlight" defaultValue={s.highlight} maxLength={30} /></label>
        <label className="full">Bajada<textarea name="lead" defaultValue={s.lead} maxLength={240} /></label>
        <ImageField label="Foto de la sección “Por qué confiar”" hint="Horizontal, proporción 5:4." name="show" current={s.showUrl} fallback="Se usa la ilustración de ejemplo" />
      </div>
      <p className="err" role="alert">{state.error}</p>
      {state.ok && <p className="ok" role="status">{state.ok}</p>}
      <button className="btn btn-brand" style={{ alignSelf: 'flex-start' }} disabled={pending}>{pending ? 'Guardando…' : 'Guardar cambios'}</button>
    </form>
  );
}
