"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import LootboxSpinner from "./LootboxSpinner";
import CreditsInfo from "./CreditsInfo";

interface CasinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
}

const CasinoModal = ({ isOpen, onClose, credits, onUpdate, onPurchaseCredits }: CasinoModalProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ winnings: number; label: string } | null>(null);
  const [spinningResult, setSpinningResult] = useState<{ winnings: number; label: string } | null>(null);
  const [betAmount, setBetAmount] = useState(10);

  const handlePlay = async () => {
    if (credits < betAmount) {
      showError(`Crédits insuffisants pour parier ${betAmount}.`);
      return;
    }

    setIsSpinning(true);
    setResult(null);
    setSpinningResult(null);

    try {
      const { data, error } = await supabase.rpc('play_casino_game', { p_bet_amount: betAmount });

      if (error) {
        throw new Error(error.message);
      }
      
      setSpinningResult(data);

    } catch (error: any) {
      showError(`Erreur au casino: ${error.message}`);
      setIsSpinning(false);
    }
  };

  const handleSpinEnd = () => {
    setResult(spinningResult);
    setIsSpinning(false);
    onUpdate();
  };

  const handleClose = () => {
    if (isSpinning) return;
    setResult(null);
    setSpinningResult(null);
    onClose();
  };

  const betOptions = [10, 50, 100, 500];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Casino de la Zone</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col items-center gap-2 text-center">
              <span>Tentez votre chance ! Le gain est déterminé par un multiplicateur.</span>
              <CreditsInfo credits={credits} onClick={onPurchaseCredits} />
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="h-24 bg-black/20 rounded-lg text-2xl font-bold overflow-hidden">
            {isSpinning && spinningResult ? (
              <LootboxSpinner resultLabel={spinningResult.label} onSpinEnd={handleSpinEnd} />
            ) : result ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-lg">Vous avez gagné</p>
                <p className="text-4xl font-bold text-yellow-400">{result.winnings} crédits</p>
                <p className="text-sm text-gray-400">({result.label})</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p>Placez votre pari.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Montant du pari :</p>
            <div className="flex gap-2">
              {betOptions.map((amount) => (
                <Button
                  key={amount}
                  variant={betAmount === amount ? "default" : "outline"}
                  onClick={() => setBetAmount(amount)}
                  disabled={isSpinning}
                  className="flex-1"
                >
                  {amount}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handlePlay} disabled={isSpinning} className="w-full bg-green-600 hover:bg-green-700">
            {isSpinning ? 'Bonne chance...' : `Parier ${betAmount} crédits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CasinoModal;