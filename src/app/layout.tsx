import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { IconSprite } from '@/components/Icons';
import { getSettings } from '@/lib/settings';
import { isWebpayTest } from '@/lib/webpay';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', weight: ['300', '400', '500', '600'] });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', weight: ['400', '500'] });

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.APP_URL || 'https://www.lemurstudio.cl'),
    title: s.name,
    description: 'Cuadros originales a precio único o por sorteo con tickets.',
    openGraph: { siteName: s.name, locale: 'es_CL', type: 'website' },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <IconSprite />
        {isWebpayTest() && <div className="testbanner">Modo de pruebas de Webpay: no se cobra dinero real.</div>}
        <Header name={s.name} logoUrl={s.logoUrl} />
        {children}
      </body>
    </html>
  );
}
