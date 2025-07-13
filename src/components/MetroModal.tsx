import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, TramFront, Ticket } from 'lucide-react';
import { MapCell, InventoryItem } from '@/types/game';

interface MetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapLayout: MapCell[];
  discoveredZones: number[];
  currentZoneId: number;
  onUpdate: () => void;
  inventory: InventoryItem[];
  credits: number;
}

const MetroModal = ({ isOpen, onClose, mapLayout, discoveredZones, currentZoneId, onUpdate, inventory, credits }: MetroModalProps) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const ticketItem = useMemo(() => inventory.find(item => item.items?.name === 'Ticket de métro'), [inventory]);
  const ticketCount = ticketItem?.quantity || 0;

  const travelOptions = useMemo(() => {
    return mapLayout.filter(zone => discoveredZones.includes(zone.id) && zone.id !== currentZoneId);
  }, [mapLayout, discoveredZones, currentZoneId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedZoneId('');
    }
  }, [isOpen]);

  const handleBuyTicket = async () => {
    setLoading(true);
    const { error } = await supabase.rpc('buy_metro_ticket');
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Ticket de métro acheté !");
      onUpdate();
    }
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <TramFront className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Métro Express</DialogTitle>
          <DialogDescription>Voyagez rapidement vers une zone découverte.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-400">Vos tickets</p>
            <p className="text-lg font-bold flex items-center justify-center gap-2">{ticketCount} <Ticket className="w-4 h-4" /></p>
            <Button variant="link" onClick={handleBuyTicket} disabled={loading || credits < 10} className="text-sm h-auto p-0 mt-2 text-yellow-400 hover:text-yellow-300">
              Acheter un ticket (10 crédits)
            </Button>
          </div>
          <div>
            <label htmlFor="destination" className="text-sm font-medium text-white font-mono">Destination</label>
            <select
              id="destination"
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="native-select mt-1 bg-white/5 border-white/20"
            >
              <option value="">Choisir une destination...</option>
              {travelOptions.map(zone => (
                <option key={zone.id} value={zone.id.toString()}>
                  {zone.type} ({zone.x}, {zone.y})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleTravel} disabled={loading || !selectedZoneId || ticketCount === 0} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Voyager'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MetroModal;