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
import { Loader2, Ticket } from "lucide-react";

interface MetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
}

const MetroModal = ({ isOpen, onClose, zone }: MetroModalProps) => {
  const { playerState, fetchPlayerState } = usePlayerState();
  const [loading, setLoading] = useState(false);

  const handleBuyTicket = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('buy_metro_ticket');
      if (error) throw error;
      showSuccess("Ticket de métro acheté !");
      fetchPlayerState();
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
            Achetez des tickets pour voyager rapidement entre les zones découvertes.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
            <p>Prix du ticket:</p>
            <p className="font-bold text-yellow-400">10 crédits</p>
          </div>
          <Button onClick={handleBuyTicket} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4 mr-2" />}
            Acheter un ticket
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

export default MetroModal;