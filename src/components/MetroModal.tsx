import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, TramFront, Ticket } from 'lucide-react';
import { MapCell } from '@/types/game';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger id="destination" className="w-full mt-1 bg-white/5 border-white/20">
                <SelectValue placeholder="Choisir une destination..." />
              </SelectTrigger>
              <SelectContent>
                {travelOptions.map(zone => (
                  <SelectItem key={zone.id} value={zone.id.toString()}>
                    {zone.type} ({zone.x}, {zone.y})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleTravel} disabled={loading || !selectedZoneId} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Voyager'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MetroModal;