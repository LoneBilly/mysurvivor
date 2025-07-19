import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, BedDouble, Coins, Zap } from 'lucide-react';
import CreditsInfo from './CreditsInfo';
import { MapCell } from '@/types/game';

const REST_COST = 20;
const ENERGY_GAIN = 50;

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
  zoneName: string;
}

const HotelModal = ({ isOpen, onClose, zone, credits, onUpdate, onPurchaseCredits, zoneName }: HotelModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleRest = async () => {
    if (!zone) return;
    setLoading(true);
    const { error } = await supabase.rpc('rest_at_hotel', {
      p_zone_id: zone.id,
    });
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Vous vous sentez reposé ! (+${ENERGY_GAIN} énergie)`);
      onUpdate();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
      >
        <DialogHeader className="text-center">
          <BedDouble className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">{zoneName}</DialogTitle>
          <DialogDescription className="sr-only">Reposez-vous pour regagner de l'énergie.</DialogDescription>
          <CreditsInfo credits={credits} className="mt-1" onClick={onPurchaseCredits} />
        </DialogHeader>
        <div className="py-4 text-center space-y-4">
          <p>Reposez-vous dans une chambre confortable pour récupérer votre énergie et continuer l'aventure.</p>
          <div className="flex justify-center items-center gap-4 text-lg font-bold">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span>- {REST_COST}</span>
            </div>
            <span className="text-gray-400">&rarr;</span>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              <span>+ {ENERGY_GAIN}</span>
            </div>
          </div>
          <Button onClick={handleRest} disabled={loading || credits < REST_COST} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Se reposer (${REST_COST} crédits)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelModal;