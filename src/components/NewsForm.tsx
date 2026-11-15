'use client';
import { useState } from 'react';

/** Suscripción a avisos. Por ahora solo confirma en pantalla; falta conectarla a un servicio de correo. */
export default function NewsForm() {
  const [msg, setMsg] = useState('');
  return (
    <div className="news">
      <h3>Avísame de nuevos sorteos</h3>
      <p style={{ fontSize: 14, opacity: 0.8 }}>Un correo cuando se publique una obra nueva o falten pocos tickets.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = String(new FormData(e.currentTarget).get('email') ?? '').trim();
          if (!/^\S+@\S+\.\S+$/.test(v)) return setMsg('Escribe un correo válido.');
          e.currentTarget.reset();
          setMsg('Listo, te avisaremos de los próximos sorteos.');
        }}
        noValidate
      >
        <input name="email" type="email" placeholder="tu@correo.cl" aria-label="Correo" />
        <button className="btn" type="submit">Suscribirme</button>
      </form>
      {msg && <p style={{ fontSize: 14 }} role="status">{msg}</p>}
    </div>
  );
}
