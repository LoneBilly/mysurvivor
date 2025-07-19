import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import ItemIcon from './ItemIcon';
import { Loader2 } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

type Zone = { id: number; x: number; y: number; type: string; icon: string; };

interface ZoneDiscoveryProps {
  discoverableZones: Zone[];
  onDiscovery: () => void;
}

export function ZoneDiscovery({ discoverableZones, onDiscovery }: ZoneDiscoveryProps) {
  const { getIconUrl } = useGame();
  const [discoveringZoneId, setDiscoveringZoneId] = useState<number | null>(null);

  const handleDiscover = async (zoneId: number) => {
    setDiscoveringZoneId(zoneId);
    const { error } = await supabase.rpc('discover_zone', { p_zone_to_discover_id: zoneId });

    if (error) {
      showError(error.message);
      setDiscoveringZoneId(null);
    } else {
      showSuccess("Nouvelle zone découverte !");
      onDiscovery();
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="font-bold mb-2">Découverte de zone</h3>
      <p className="text-sm text-muted-foreground mb-4">Choisissez une zone adjacente à révéler.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {discoverableZones.map((zone) => (
          <div key={zone.id} className="border p-2 rounded-md text-center flex flex-col items-center justify-between bg-background/50">
            <div className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center mx-auto mb-2">
              <ItemIcon iconName={getIconUrl(zone.icon) || zone.icon} alt={zone.type} />
            </div>
            <div className='flex-grow'>
                <p className="text-sm font-semibold">{zone.type}</p>
                <p className="text-xs text-muted-foreground">({zone.x}, {zone.y})</p>
            </div>
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => handleDiscover(zone.id)}
              disabled={discoveringZoneId !== null}
            >
              {discoveringZoneId === zone.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Révéler'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}