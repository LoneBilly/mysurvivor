import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { BedDouble, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Progress } from './ui/progress';

interface BedModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
}

const BedModal = ({ isOpen, onClose, construction }: BedModalProps) => {
  const { playerData, setPlayerData, refreshPlayerData } = useGame();
  const [isSleeping, setIsSleeping] = useState(false);
  const initialEnergy = useRef(0);

  const handleSleep = () => {
    initialEnergy.current = playerData.playerState.energie;
    setIsSleeping(true);
  };

  const handleWakeUp = async () => {
    setIsSleeping(false);
    const finalEnergy = playerData.playerState.energie;
    
    // Only call DB if energy has actually changed
    if (finalEnergy > initialEnergy.current) {
      const { error } = await supabase.rpc('rest_in_bed', { p_new_energy: finalEnergy });
      if (error) {
        showError("Erreur de synchronisation de l'énergie.");
        // Revert optimistic update on error
        setPlayerData(prev => ({
          ...prev,
          playerState: { ...prev.playerState, energie: initialEnergy.current }
        }));
      }
    }
    onClose();
  };

  useEffect(() => {
    if (!isSleeping) return;

    const sleepInterval = setInterval(() => {
      setPlayerData(prev => {
        const currentEnergy = prev.playerState.energie;
        if (currentEnergy >= 100) {
          clearInterval(sleepInterval);
          handleWakeUp();
          return prev;
        }
        return {
          ...prev,
          playerState: { ...prev.playerState, energie: currentEnergy + 1 }
        };
      });
    }, 1000);

    return () => clearInterval(sleepInterval);
  }, [isSleeping, setPlayerData]);

  useEffect(() => {
    // Reset state when modal is closed
    if (!isOpen) {
      setIsSleeping(false);
    }
  }, [isOpen]);

  if (!construction) return null;

  return (
    <>
      <Dialog open={isOpen && !isSleeping} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader className="text-center">
            <BedDouble className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Lit</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-4">
            <p>Reposez-vous pour regagner de l'énergie.</p>
            <Button onClick={handleSleep} disabled={playerData.playerState.energie >= 100} className="w-full">
              {playerData.playerState.energie >= 100 ? "Énergie au maximum" : "Dormir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isSleeping && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white p-4">
          <h2 className="text-4xl font-bold font-mono animate-pulse">Zzz...</h2>
          <div className="mt-8 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-400" />
                <span className="text-lg">Énergie</span>
              </div>
              <span className="text-lg font-bold">{playerData.playerState.energie} / 100</span>
            </div>
            <Progress value={playerData.playerState.energie} className="h-4" />
          </div>
          <Button onClick={handleWakeUp} className="mt-8">
            Se réveiller
          </Button>
        </div>
      )}
    </>
  );
};

export default BedModal;