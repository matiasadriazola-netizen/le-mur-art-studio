import ArtworkForm from '../../../ArtworkForm';
import { toChileInput } from '@/lib/format';
import { frameOptions, techniqueOptions } from '@/lib/techniques';

export default async function Nueva() {
  return (
    <ArtworkForm
      techniques={await techniqueOptions()}
      frames={await frameOptions()}
      initial={{ type: 'RIFA', title: '', artist: '', technique: '', size: '', value: null, description: '', price: 5000, totalTickets: 20, endsAt: toChileInput(new Date(Date.now() + 7 * 86_400_000)), policy: 'DRAW', photos: [], soldOrHeld: 0 }}
    />
  );
}
