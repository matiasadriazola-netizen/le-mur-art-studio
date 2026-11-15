import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { isWebpayTest } from '@/lib/webpay';
import { logout } from '../actions';

export const metadata = { title: 'Panel · Le Mur Art Studio', robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const s = await getSettings();
  return (
    <>
      <header className="topbar solid">
        <div className="wrap">
          <Link className="logo" href="/admin">{s.logoUrl ? <img src={s.logoUrl} alt={s.name} className={s.logoUrl === '/brand/logo-le-mur.png' ? 'brand' : ''} /> : <span>{s.name}</span>}</Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="btn btn-line btn-sm" href="/">Ver sitio</Link>
            <form action={logout}><button className="btn btn-line btn-sm">Salir</button></form>
          </div>
        </div>
      </header>
      <main className="wrap" style={{ paddingTop: 'calc(96px + env(safe-area-inset-top,0px))', paddingBottom: 56 }}>
        <div className="admin-head" style={{ paddingTop: 0 }}>
          <div><span className="tag">{isWebpayTest() ? 'Webpay en modo de pruebas' : 'Webpay en producción'}</span><h1>Panel de administración</h1></div>
          <Link className="btn btn-brand" href="/admin/obras/nueva">+ Publicar cuadro</Link>
        </div>
        <nav className="seg admin-nav" aria-label="Secciones del panel">
          <Link className="btn btn-sm" href="/admin">Obras</Link>
          <Link className="btn btn-sm" href="/admin/pagos">Pagos y reembolsos</Link>
          <Link className="btn btn-sm" href="/admin/sitio">Logo y fotos del sitio</Link>
        </nav>
        {children}
      </main>
    </>
  );
}
