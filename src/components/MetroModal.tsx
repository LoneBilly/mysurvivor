import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, TramFront, Ticket } from 'lucide-react';
import { MapCell } from '@/types/game';

interface MetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapLayout: MapCell[];
  discoveredZones: number[];
  currentZoneId: number;
  onUpdate: () => void;
}

const MetroModal = ({ isOpen, onClose, mapLayout, discoveredZones, currentZoneId, onUpdate }: MetroModalProps) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const travelOptions = useMemo(() => {
    return mapLayout.filter(zone => discoveredZones.includes(zone.id) && zone.id !== currentZoneId);
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
          <p className="text-center text-sm flex items-center justify-center gap-2">
            Coût du voyage: 1 <Ticket className="w-4 h-4 inline-block" /> Ticket de métro
          </p>
          <div>
            <label htmlFor="destination" className="text-sm font-medium text-white font-mono">Destination</label>
            <select
              id="destination"
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/30"
            >
              <option value="">Choisir une destination...</option>
              {travelOptions.map(zone => (
                <option key={zone.id} value={zone.id.toString()}>
                  {zone.type} ({zone.x}, {zone.y})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleTravel} disabled={loading || !selectedZoneId} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Voyager'}
          </Button>
          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/20 mt-4">
            <p className="text-sm">Vous n'avez pas de ticket ?</p>
            <Button onClick={handleBuyTicket} disabled={buyLoading} size="sm" className="mt-2">
                {buyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acheter un ticket (10 crédits)"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MetroModal;