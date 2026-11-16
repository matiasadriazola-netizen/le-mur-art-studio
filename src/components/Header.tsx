'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icons';

type Props = { name: string; logoUrl: string | null };

const NAV = [
  { href: '/', label: 'Inicio', key: 'inicio' },
  { href: '/#remates', label: 'Remates', key: 'remates' },
  { href: '/#venta', label: 'Venta directa', key: 'venta' },
  { href: '/#como', label: 'Cómo funciona', key: 'como' },
  { href: '/#ganadores', label: 'Ganadores', key: 'ganadores' },
];

export default function Header({ name, logoUrl }: Props) {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (path.startsWith('/admin')) return null;
  const solid = scrolled || path !== '/';
  const isBrand = logoUrl === '/brand/logo-le-mur.png';
  return (
    <>
      <header className={`topbar${solid ? ' solid' : ''}`}>
        <div className="wrap">
          <Link className="logo" href="/" aria-label={name}>
            {logoUrl ? <img src={logoUrl} alt={name} className={isBrand ? 'brand' : ''} /> : <><i aria-hidden="true" /><span>{name}</span></>}
          </Link>
          <nav className="navpill" aria-label="Principal">
            {NAV.map((n) => <Link key={n.key} href={n.href} aria-current={path === '/' && n.key === 'inicio' ? 'true' : undefined}>{n.label}</Link>)}
          </nav>
          <Link className="btn btn-lime btn-sm" href="/#remates">Participar</Link>
        </div>
      </header>
      <nav className="tabbar" aria-label="Navegación">
        <Link href="/" aria-current={path === '/' ? 'true' : undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>Inicio</Link>
        <Link href="/#remates"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 9.5a2 2 0 0 0 0 4V17a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3.5a2 2 0 0 1 0-4V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /></svg>Remates</Link>
        <Link href="/#venta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 16l5-5 4 4 3-3 6 6" /></svg>Venta</Link>
        <Link href="/#ganadores"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /></svg>Ganadores</Link>
        <Link href="/#como"><Icon name="grid" />Ayuda</Link>
      </nav>
    </>
  );
}
