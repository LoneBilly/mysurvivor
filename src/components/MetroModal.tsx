import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, TramFront, Ticket } from 'lucide-react';
import { MapCell } from '@/types/game';
import { useGame } from '@/contexts/GameContext';

interface MetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapLayout: MapCell[];
  discoveredZones: number[];
  currentZoneId: number;
  onUpdate: () => void;
}

const MetroModal = ({ isOpen, onClose, mapLayout, discoveredZones, currentZoneId, onUpdate }: MetroModalProps) => {
  const { playerData } = useGame();
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const metroTickets = useMemo(() => {
    const ticketItem = playerData.inventory.find(item => item.items?.name === 'Ticket de métro');
    return ticketItem ? ticketItem.quantity : 0;
  }, [playerData.inventory]);

  const travelOptions = useMemo(() => {
    return mapLayout.filter(zone => 
      discoveredZones.includes(zone.id) && 
      zone.id !== currentZoneId &&
      zone.type !== 'unknown' &&
      !(zone.x === 3 && zone.y === 1)
    );
  }, [mapLayout, discoveredZones, currentZoneId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedZoneId('');
    }
  }, [isOpen]);

  const handleTravel = async () => {
    if (!selectedZoneId) {
      showError("Veuillez sélectionner une destination.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('use_metro_ticket', {
      p_target_zone_id: parseInt(selectedZoneId, 10),
    });
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      const destination = mapLayout.find(z => z.id === parseInt(selectedZoneId, 10));
      showSuccess(`Voyage vers ${destination?.type || 'destination'} réussi !`);
      onUpdate();
      onClose();
    }
  };

  const handleBuyTicket = async () => {
    setBuyLoading(true);
    const { error } = await supabase.rpc('buy_metro_ticket');
    setBuyLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Ticket de métro acheté !");
      onUpdate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <TramFront className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Métro Express</DialogTitle>
          <DialogDescription>Voyagez rapidement vers une zone découverte.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
            <div className="text-sm flex items-center gap-2">
              <Ticket className="w-4 h-4 text-yellow-400" />
              <span>Vos tickets: <span className="font-bold">{metroTickets}</span></span>
            </div>
            <Button onClick={handleBuyTicket} size="sm" disabled={buyLoading}>
              {buyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Acheter (10 crédits)'}
            </Button>
          </div>
          <div>
            <label htmlFor="destination" className="text-sm font-medium text-white font-mono">Destination</label>
            <select
              id="destination"
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full mt-1 bg-white/5 border-white/20 px-3 h-10 rounded-lg text-white focus:ring-white/30 focus:border-white/30"
            >
              <option value="" disabled>Choisir une destination...</option>
              {travelOptions.map(zone => (
                <option key={zone.id} value={zone.id.toString()}>
                  {zone.type} ({zone.x}, {zone.y})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleTravel} disabled={loading || !selectedZoneId || metroTickets < 1} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Utiliser 1 ticket'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MetroModal;