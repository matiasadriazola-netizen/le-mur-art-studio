'use client';
import { useState } from 'react';

/** Foto grande con miniaturas para cambiar entre las fotos de la obra. */
export default function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [i, setI] = useState(0);
  const list = photos.length ? photos : ['/seed/placeholder.svg'];
  return (
    <div className="gallery">
      <img className="main-img" src={list[i]} alt={list.length > 1 ? `${title} · foto ${i + 1} de ${list.length}` : title} />
      {list.length > 1 && (
        <div className="thumbs" role="group" aria-label="Fotos de la obra">
          {list.map((u, k) => <button key={u} type="button" aria-pressed={k === i} aria-label={`Ver foto ${k + 1}`} onClick={() => setI(k)}><img src={u} alt="" loading="lazy" /></button>)}
        </div>
      )}
    </div>
  );
}
