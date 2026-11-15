import Link from 'next/link';
import { catalog, isOpenRifa, leftOf, type CardItem } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';
import { CLP, deArtist, meta } from '@/lib/format';
import { Icon } from '@/components/Icons';
import Explore from '@/components/Explore';
import { gpillText, Img, isHot } from '@/components/ArtCard';
import { TimerPill, TimerText } from '@/components/Timer';
import NewsForm from '@/components/NewsForm';

function Overlay({ a, cls }: { a: CardItem; cls: string }) {
  return (
    <Link className={`ov ${cls}`} href={`/obra/${a.slug}`} aria-label={`Ver ${a.title}`}>
      <Img a={a} className="bg" />
      <div className="top">
        <span className={`gpill${isHot(a) ? ' lime' : ''}`}>{gpillText(a)}</span>
        {isOpenRifa(a) && a.endsAt && <TimerPill endsAt={a.endsAt} />}
      </div>
      <div className="bot">
        <div><h3>{a.title}</h3><div className="sub">{meta(a.artist, CLP(a.price) + (a.type === 'RIFA' ? ' por ticket' : ''))}</div></div>
        <span className="arrow"><Icon name="arrow" /></span>
      </div>
    </Link>
  );
}

export default async function Home() {
  const [items, s] = await Promise.all([catalog(), getSettings()]);
  const openR = items.filter(isOpenRifa).sort((a, b) => leftOf(a) - leftOf(b));
  const openV = items.filter((a) => a.type === 'VENTA' && a.status === 'OPEN');
  const drawn = items.filter((a) => a.status === 'DRAWN').sort((a, b) => (b.drawAt ?? '').localeCompare(a.drawAt ?? ''));
  const ticketsSold = items.filter((a) => a.type === 'RIFA').reduce((n, a) => n + a.sold, 0);
  const close1 = openR[0], lastW = drawn[0], cheap = [...openV].sort((a, b) => a.price - b.price)[0];
  const minTicket = openR.length ? Math.min(...openR.map((a) => a.price)) : null;
  const picks: [CardItem | undefined, string][] = [[openR[0], 'tall'], [openR[1], ''], [openV[0], ''], [openV[1] ?? openR[2], 'wide']];
  const minis = [openR[1] ?? openR[0], openV[0]].filter(Boolean) as CardItem[];

  return (
    <div>
      <div className="hero" id="inicio">
        {s.heroUrl ? <img className="bg" src={s.heroUrl} alt="" /> : <img className="bg" src="/seed/hero.svg" alt="" />}
        <div className="wrap">
          <div>
            <span className="tag">Best Artist. Paintings</span>
            <h1>{s.title}<br /><b>{s.highlight}</b></h1>
            <p className="lead">{s.lead}</p>
            <div className="hero-ctas">
              <Link className="btn btn-lime" href="/#sorteos">Ver sorteos <Icon name="right" /></Link>
              <Link className="btn btn-glass" href="/#venta">Comprar directo</Link>
            </div>
            {ticketsSold > 0 && <div className="social-proof"><span>{ticketsSold} tickets vendidos{minTicket ? ` · desde ${CLP(minTicket)} por ticket` : ''}</span></div>}
          </div>
          <div className="floaters">
            {close1 && (
              <Link className="floater" href={`/obra/${close1.slug}`}>
                <Img a={close1} /><div><b>{leftOf(close1) === 1 ? 'Queda 1 ticket' : `Quedan ${leftOf(close1)} tickets`}</b><span>{close1.title}<br />Cierra en {close1.endsAt ? <TimerText endsAt={close1.endsAt} /> : '—'}</span></div>
              </Link>
            )}
            {lastW && <Link className="floater" href={`/obra/${lastW.slug}`}><Img a={lastW} /><div><b>Ganó {lastW.winnerName}</b><span>Ticket #{lastW.winnerNumber} · {lastW.title}</span></div></Link>}
            {cheap && <Link className="floater" href={`/obra/${cheap.slug}`}><Img a={cheap} /><div><b>Venta directa</b><span>{cheap.title} · {CLP(cheap.price)}</span></div></Link>}
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="trust">
          <span className="lbl">Pagos con</span>
          <div className="items"><span><Icon name="lock" />Webpay</span><span>Débito, crédito y prepago</span><span><Icon name="shield" />Sorteos con código público</span></div>
        </div>

        {picks.some(([a]) => a) && (
          <section id="destacados">
            <div className="sec-head">
              <div><span className="tag">Destacados</span><h2>Obras que están<br />por <em>cerrar</em>.</h2></div>
              <p className="sec-sub">Sorteos con pocos tickets disponibles y obras en venta directa recién publicadas.</p>
            </div>
            <div className="bento">{picks.map(([a, cls], i) => a && <Overlay key={a.id + i} a={a} cls={cls} />)}</div>
          </section>
        )}

        <section id="explorar">
          <span id="sorteos" /><span id="venta" />
          <Explore items={items} />
        </section>

        <section>
          <div className="features">
            <div>
              <span className="tag">Por qué confiar</span>
              <div className="sec-head" style={{ marginBottom: 0 }}><h2>Transparente en cada <em>ticket</em>.</h2></div>
              <p className="sec-sub">Cada compra queda registrada y cada sorteo deja un rastro que cualquiera puede revisar.</p>
              <div className="flist">
                <div className="feat"><span className="ic"><Icon name="dice" /></span><div><b>Sorteo verificable</b><p>Se ejecuta al venderse el último ticket o al cumplirse el plazo, y publica número, ganador y la prueba para recalcularlo.</p></div></div>
                <div className="feat"><span className="ic"><Icon name="lock" /></span><div><b>Pago con Webpay</b><p>Pagas en el sitio de Transbank. Tus datos de tarjeta nunca pasan por nuestro sitio.</p></div></div>
                <div className="feat"><span className="ic"><Icon name="box" /></span><div><b>Envío asegurado</b><p>Embalaje profesional y certificado de autenticidad firmado por el artista.</p></div></div>
              </div>
            </div>
            <div className="showcase">
              <img className="bg" src={s.showUrl || '/seed/show.svg'} alt="" />
              {lastW && <div className="verify"><b>{lastW.drawExternal ? 'Último sorteo' : 'Último sorteo verificado'}</b><span style={{ fontSize: 13 }}>{lastW.winnerName} · ticket #{lastW.winnerNumber}</span><div className="mono">{lastW.drawExternal ? 'Realizado en vivo' : lastW.drawCode}</div></div>}
              <div className="minis">{minis.map((a) => <Link key={a.id} className="mini" href={`/obra/${a.slug}`} aria-label={`Ver ${a.title}`}><Img a={a} /><span className="arrow"><Icon name="arrow" /></span></Link>)}</div>
            </div>
          </div>
        </section>

        <section id="como">
          <div className="sec-head"><div><span className="tag">Cómo funciona</span><h2>Dos formas de comprar</h2></div></div>
          <div className="how">
            <div className="panel-soft"><span className="pill hot">Sorteo por ticket</span><h3>Gánalo con un número</h3>
              <ol><li><div><b>Elige tus números</b><span>Cada obra tiene una cantidad fija de tickets. Compra uno o varios.</span></div></li>
                <li><div><b>Se completan los tickets</b><span>El sorteo se hace cuando se vende el último, o al cumplirse la fecha de cierre.</span></div></li>
                <li><div><b>Se publica el ganador</b><span>Con nombre, número y una prueba que cualquiera puede verificar.</span></div></li></ol></div>
            <div className="panel-soft"><span className="pill sale">Venta directa</span><h3>Cómpralo hoy</h3>
              <ol><li><div><b>Elige la obra</b><span>Cada cuadro tiene un precio único publicado.</span></div></li>
                <li><div><b>Paga con Webpay</b><span>La primera persona que paga se lleva la obra.</span></div></li>
                <li><div><b>Te lo enviamos</b><span>Coordinamos el despacho a tu comuna, con embalaje y certificado.</span></div></li></ol></div>
          </div>
        </section>

        <section id="ganadores">
          <div className="sec-head"><div><span className="tag">Ganadores</span><h2>Sorteos realizados</h2></div><p className="sec-sub">Se publica el nombre y la inicial del apellido de cada ganador.</p></div>
          <div className="wlist">
            {drawn.length ? drawn.map((a) => (
              <Link key={a.id} className="wcard" href={a.drawExternal ? `/obra/${a.slug}` : `/verificar/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="stubn">#{String(a.winnerNumber).padStart(2, '0')}</div>
                <div className="info"><b>{a.winnerName}</b><span>ganó “{a.title}”{deArtist(a.artist)}</span>
                  <span className="mono">{new Date(a.drawAt!).toLocaleDateString('es-CL', { dateStyle: 'medium' })} · {a.drawSold} tickets · {a.drawExternal ? 'sorteo en vivo' : a.drawCode}</span></div>
              </Link>
            )) : <div className="empty">Aún no hay sorteos realizados.</div>}
          </div>
        </section>
      </div>

      <div className="wrap">
        <div className="band"><div className="inner">
          <div>{s.logoUrl && <img className="band-logo" src={s.logoUrl} alt={s.name} />}<h2>¿Eres artista? Vende tu obra <b>completa</b> o por <b>tickets</b>.</h2></div>
          <div><p>Escríbenos con fotos de tu obra. Tú eliges precio único o cantidad de tickets, y recibes el pago cuando se cierra la venta.</p></div>
        </div></div>
        <div className="closing">
          <div className="fcols">
            <div><b>Explorar</b><Link href="/#sorteos">Sorteos</Link><Link href="/#venta">Venta directa</Link><Link href="/#ganadores">Ganadores</Link></div>
            <div><b>Ayuda</b><Link href="/#como">Cómo funciona</Link><Link href="/#como">Envíos</Link></div>
            <div><b>Estudio</b><a href="https://www.instagram.com/le.mur.studio/" target="_blank" rel="noopener noreferrer" className="ig"><Icon name="ig" size={16} />@le.mur.studio</a><Link href="/admin">Administración</Link></div>
          </div>
          <NewsForm />
        </div>
        <footer className="base"><span>© {new Date().getFullYear()} {s.name} · <a href="https://www.instagram.com/le.mur.studio/" target="_blank" rel="noopener noreferrer">Instagram @le.mur.studio</a></span><span>Pagos procesados por Webpay (Transbank)</span></footer>
      </div>
    </div>
  );
}
