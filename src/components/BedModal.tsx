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
  const [optimisticEnergy, setOptimisticEnergy] = useState(0);
  const sleepInterval = useRef<NodeJS.Timeout | null>(null);

  const handleSleep = async () => {
    if (!construction) return;
    const { error } = await supabase.rpc('start_sleep', { p_construction_id: construction.id });
    if (error) {
      showError("Impossible de commencer à dormir.");
      return;
    }
    setOptimisticEnergy(playerData.playerState.energie);
    setIsSleeping(true);
  };

  const handleWakeUp = async () => {
    if (sleepInterval.current) clearInterval(sleepInterval.current);
    setIsSleeping(false);

    const { data: newEnergy, error } = await supabase.rpc('rest_in_bed');

    if (error) {
      showError("Erreur de synchronisation de l'énergie.");
      refreshPlayerData();
    } else {
      setPlayerData(prev => ({
        ...prev,
        playerState: { ...prev.playerState, energie: newEnergy }
      }));
    }
    onClose();
  };

  useEffect(() => {
    if (isSleeping) {
      sleepInterval.current = setInterval(() => {
        setOptimisticEnergy(prevEnergy => {
          if (prevEnergy >= 100) {
            if (sleepInterval.current) clearInterval(sleepInterval.current);
            handleWakeUp();
            return 100;
          }
          // Note: This is just a visual prediction. The server has the final say.
          // We assume a base regen of 1/s for the UI. The server will correct it.
          return prevEnergy + 1;
        });
      }, 1000);
    }

    return () => {
      if (sleepInterval.current) clearInterval(sleepInterval.current);
    };
  }, [isSleeping]);

  useEffect(() => {
    if (!isOpen) {
      setIsSleeping(false);
      if (sleepInterval.current) clearInterval(sleepInterval.current);
    } else {
      setOptimisticEnergy(playerData.playerState.energie);
    }
  }, [isOpen, playerData.playerState.energie]);

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
              <span className="text-lg font-bold">{Math.min(100, optimisticEnergy)} / 100</span>
            </div>
            <Progress value={optimisticEnergy} className="h-4" />
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