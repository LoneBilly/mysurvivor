import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapCell } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerState } from "@/hooks/usePlayerState";
import { Loader2, Dices, Gavel } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";

interface CasinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
}

const CasinoModal = ({ isOpen, onClose, zone }: CasinoModalProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const { playerState, fetchPlayerState } = usePlayerState();
  const navigate = useNavigate();

  const handlePlay = async () => {
    if (!playerState || !betAmount || betAmount <= 0) {
      showError("Montant de pari invalide.");
      return;
    }
    if (playerState.credits < betAmount) {
      showError("Crédits insuffisants.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("play_casino_game", {
        p_bet_amount: betAmount,
      });

      if (error) throw error;

      const { winnings, label } = data;
      if (winnings > 0) {
        showSuccess(`Vous avez gagné ${winnings} crédits ! Résultat: ${label}`);
      } else {
        showError(`Vous avez perdu ${betAmount} crédits. Résultat: ${label}`);
      }
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
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
      >
        <DialogHeader>
          <DialogTitle>{zone.id_name || zone.type}</DialogTitle>
          <DialogDescription>
            Tentez votre chance et gagnez gros !
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-center">
            <p className="text-lg">Votre solde: <span className="font-bold text-yellow-400">{playerState?.credits} crédits</span></p>
          </div>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-white/5 border-white/20"
              min="1"
            />
            <Button onClick={handlePlay} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4 mr-2" />}
              Parier
            </Button>
          </div>
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/game/auction')}>
            <Gavel className="w-4 h-4 mr-2" />
            Voir les enchères
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CasinoModal;