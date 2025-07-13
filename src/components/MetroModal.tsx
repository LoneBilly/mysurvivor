import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, TramFront } from 'lucide-react';
import { MapCell } from '@/types/game';
import { ScrollArea } from './ui/scroll-area';
import * as LucideIcons from "lucide-react";

interface MetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapLayout: MapCell[];
  discoveredZones: number[];
  onUpdate: () => void;
}

const MetroModal = ({ isOpen, onClose, mapLayout, discoveredZones, onUpdate }: MetroModalProps) => {
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const discoveredMetroStations = useMemo(() => {
    const discoveredSet = new Set(discoveredZones);
    return mapLayout.filter(cell => cell.type === 'métro' && discoveredSet.has(cell.id));
  }, [mapLayout, discoveredZones]);

  const handleTravel = async () => {
    if (!selectedZoneId) return;
    setLoading(true);
    const { error } = await supabase.rpc('use_metro_ticket', { p_target_zone_id: selectedZoneId });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Voyage réussi !");
      onUpdate();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <TramFront className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle>Réseau de Métro</DialogTitle>
          <DialogDescription>Voyagez instantanément vers une autre station. Nécessite un ticket de métro.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-60 w-full rounded-md border border-slate-700 p-2 my-4">
          <div className="space-y-2">
            {discoveredMetroStations.map(station => {
              const Icon = (LucideIcons as any)[station.icon || 'MapPin'];
              return (
                <Button
                  key={station.id}
                  variant={selectedZoneId === station.id ? "default" : "outline"}
                  onClick={() => setSelectedZoneId(station.id)}
                  className="w-full justify-start gap-3"
                >
                  <Icon className="w-4 h-4" />
                  Station ({station.x}, {station.y})
                </Button>
              );
            })}
          </div>
        </ScrollArea>
        <Button onClick={handleTravel} disabled={!selectedZoneId || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voyager"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default MetroModal;