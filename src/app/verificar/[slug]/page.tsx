import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { fmtLong } from '@/lib/format';

export default async function Verificar({ params }: { params: Promise<{ slug: string }> }) {
  const a = await prisma.artwork.findUnique({ where: { slug: (await params).slug }, include: { draw: true } });
  if (!a || a.type !== 'RIFA') notFound();
  const d = a.draw;
  return (
    <main className="wrap page" style={{ paddingBottom: 64, maxWidth: 820 }}>
      <Link className="back" href={`/obra/${a.slug}`}>← Volver a la obra</Link>
      <h1 style={{ fontSize: 'clamp(30px,4vw,44px)', marginBottom: 18 }}>Verificar el sorteo de “{a.title}”</h1>
      <div className="verify-box">
        <span className="lbl">1 · Antes del sorteo</span>
        <p>Al publicar la obra se generó una semilla secreta y se publicó solo su huella (SHA-256). Así nadie puede cambiar la semilla después de ver quién compró:</p>
        <code>{a.seedHash}</code>
      </div>
      {d ? (
        <>
          <div className="verify-box" style={{ marginTop: 14 }}>
            <span className="lbl">2 · El sorteo ({fmtLong(d.createdAt)})</span>
            <p>Se usaron los {d.ticketsSold} tickets pagados, ordenados por número, en formato <code>número:orden</code>:</p>
            <code style={{ maxHeight: 160, overflow: 'auto', display: 'block' }}>{d.ticketList}</code>
            <p>Semilla revelada:</p><code>{a.seed}</code>
            <p>Se calcula <code>SHA-256(semilla + &quot;|&quot; + lista)</code>:</p><code>{d.digest}</code>
            <p>Ese número (en hexadecimal) módulo {d.ticketsSold} da la posición del ganador en la lista.</p>
          </div>
          <div className="verify-box" style={{ marginTop: 14 }}>
            <span className="lbl">3 · Resultado</span>
            <p style={{ fontSize: 22 }}>Ticket <b>#{d.winnerNumber}</b> · {d.winnerName}</p>
            <p className="muted" style={{ fontSize: 14 }}>Para comprobarlo: verifica que SHA-256 de la semilla coincide con la huella del paso 1, y recalcula el paso 2 con cualquier herramienta de SHA-256.</p>
          </div>
        </>
      ) : (
        <div className="verify-box" style={{ marginTop: 14 }}><span className="lbl">2 · Pendiente</span><p>El sorteo todavía no se realiza. La semilla se revelará aquí cuando ocurra.</p></div>
      )}
    </main>
  );
}
