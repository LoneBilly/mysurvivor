import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapCell } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Coins } from 'lucide-react';
import Icon from './Icon';

interface MetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapLayout: MapCell[];
  discoveredZones: number[];
  currentZoneId: number;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
  zoneName: string;
}

const MetroModal: React.FC<MetroModalProps> = ({
  isOpen,
  onClose,
  mapLayout,
  discoveredZones,
  currentZoneId,
  credits,
  onUpdate,
  onPurchaseCredits,
  zoneName,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const travelCost = 10;

  const travelableZones = useMemo(() => {
    return mapLayout
      .filter(zone => 
        discoveredZones.includes(zone.id) && 
        zone.id !== currentZoneId &&
        zone.type
      )
      .sort((a, b) => (a.type || '').localeCompare(b.type || ''));
  }, [mapLayout, discoveredZones, currentZoneId]);

  const handleTravel = async (zoneId: number) => {
    if (credits < travelCost) {
      showError("Crédits insuffisants pour voyager.");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.rpc('travel_with_credits', { p_target_zone_id: zoneId });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Voyage réussi !");
      onUpdate();
      onClose();
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-700/50 border-slate-600 flex-shrink-0 relative p-1">
              <Icon name="Metro" className="w-full h-full text-sky-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{zoneName}</DialogTitle>
              <DialogDescription>
                Voyagez rapidement vers une zone découverte.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="my-4">
          <div className="flex justify-between items-center p-2 rounded-md bg-slate-900/50">
            <span className="text-slate-300">Vos crédits :</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-yellow-400">{credits}</span>
              <Coins className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>
        <ScrollArea className="max-h-[40vh] pr-4">
          <div className="space-y-2">
            {travelableZones.length > 0 ? (
              travelableZones.map(zone => (
                <div key={zone.id} className="flex items-center justify-between p-2 rounded-md bg-slate-900/50 hover:bg-slate-800/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon name={zone.icon || 'Landmark'} className="w-6 h-6 text-slate-300" />
                    <span className="font-medium">{zone.type}</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleTravel(zone.id)} 
                    disabled={isLoading || credits < travelCost}
                    className="bg-sky-500 hover:bg-sky-600"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <div className="flex items-center gap-2">
                        <span>{travelCost}</span>
                        <Coins className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p>Aucune autre destination découverte pour le moment.</p>
                <p className="text-sm">Explorez le monde pour en trouver de nouvelles !</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="mt-4 text-center">
          <Button variant="link" className="text-sky-400" onClick={onPurchaseCredits}>
            Acheter des crédits
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MetroModal;