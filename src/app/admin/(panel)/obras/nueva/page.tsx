import ArtworkForm from '../../../ArtworkForm';
import { toChileInput } from '@/lib/format';

export default function Nueva() {
  return <ArtworkForm initial={{ type: 'RIFA', title: '', artist: '', technique: '', size: '', value: null, description: '', price: 5000, totalTickets: 20, endsAt: toChileInput(new Date(Date.now() + 7 * 86_400_000)), policy: 'DRAW', imageUrl: null, soldOrHeld: 0 }} />;
}
