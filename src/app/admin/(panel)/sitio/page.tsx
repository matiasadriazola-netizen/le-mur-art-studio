import { getSettings } from '@/lib/settings';
import SiteForm from '../../SiteForm';

export default async function Sitio() {
  const s = await getSettings();
  return <SiteForm s={{ name: s.name, logoUrl: s.logoUrl, heroUrl: s.heroUrl, showUrl: s.showUrl, title: s.title, highlight: s.highlight, lead: s.lead }} />;
}
