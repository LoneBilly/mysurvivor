import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapCell } from "@/types/game";
import { usePlayerState } from "@/hooks/usePlayerState";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Loader2, BedDouble } from "lucide-react";

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
}

const HotelModal = ({ isOpen, onClose, zone }: HotelModalProps) => {
  const { playerState, fetchPlayerState } = usePlayerState();
  const [loading, setLoading] = useState(false);

  const handleRest = async () => {
    if (!zone) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('rest_at_hotel', { p_zone_id: zone.id });
      if (error) throw error;
      showSuccess("Vous vous sentez reposé ! (+50 Énergie)");
      fetchPlayerState();
      onClose();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!zone) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{zone.id_name || zone.type}</DialogTitle>
          <DialogDescription>
            Reposez-vous et récupérez de l'énergie pour continuer votre aventure.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
            <p>Se reposer (Restaure 50 Énergie):</p>
            <p className="font-bold text-yellow-400">20 crédits</p>
          </div>
          <Button onClick={handleRest} disabled={loading || (playerState?.energie ?? 100) >= 100} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BedDouble className="w-4 h-4 mr-2" />}
            { (playerState?.energie ?? 100) >= 100 ? "Énergie pleine" : "Se reposer" }
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HotelModal;