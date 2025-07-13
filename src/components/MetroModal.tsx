import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapCell } from '@/types/game';
import { TrainFront, Ticket } from 'lucide-react';

interface MetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveredZones: number[];
  mapLayout: MapCell[];
  onTravel: (zoneId: number) => void;
  loading: boolean;
}

const MetroModal = ({ isOpen, onClose, discoveredZones, mapLayout, onTravel, loading }: MetroModalProps) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  const availableZones = useMemo(() => {
    const discoveredSet = new Set(discoveredZones);
    return mapLayout.filter(zone => discoveredSet.has(zone.id) && zone.type !== 'unknown');
  }, [discoveredZones, mapLayout]);

  const handleTravel = () => {
    if (selectedZoneId) {
      onTravel(parseInt(selectedZoneId, 10));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <TrainFront className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Métro</DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Voyagez rapidement vers n'importe quelle zone découverte.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Destination</label>
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger className="w-full bg-white/5 border-white/20">
                <SelectValue placeholder="Choisissez une zone..." />
              </SelectTrigger>
              <SelectContent>
                {availableZones.map(zone => (
                  <SelectItem key={zone.id} value={zone.id.toString()}>
                    {zone.type} ({zone.x}, {zone.y})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-center text-yellow-400 flex items-center justify-center gap-2">
            Coût: 1 <Ticket className="w-4 h-4" /> Ticket de métro
          </p>
          <Button onClick={handleTravel} disabled={!selectedZoneId || loading} className="w-full">
            {loading ? 'Voyage en cours...' : 'Voyager'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MetroModal;