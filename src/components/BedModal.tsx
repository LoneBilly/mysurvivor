import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { BedDouble, Zap, Trash2, ArrowUpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Progress } from './ui/progress';
import BuildingUpgradeModal from './BuildingUpgradeModal';

interface BedModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
}

const BedModal = ({ isOpen, onClose, construction, onDemolish }: BedModalProps) => {
  const { playerData, setPlayerData, refreshPlayerData, buildingLevels } = useGame();
  const [isSleeping, setIsSleeping] = useState(false);
  const [optimisticEnergy, setOptimisticEnergy] = useState(0);
  const sleepInterval = useRef<NodeJS.Timeout | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const regenRate = useMemo(() => {
    if (!construction) return 1;
    const levelInfo = buildingLevels.find(
        bl => bl.building_type === construction.type && bl.level === construction.level
    );
    return levelInfo?.stats?.energy_regen_per_second ?? 1;
  }, [construction, buildingLevels]);

  const hasNextLevel = useMemo(() => {
    if (!construction) return false;
    return buildingLevels.some(
      level => level.building_type === construction.type && level.level === construction.level + 1
    );
  }, [construction, buildingLevels]);

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
    onClose(); // Ferme la modale immédiatement

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
          return prevEnergy + regenRate;
        });
      }, 1000);
    }

    return () => {
      if (sleepInterval.current) clearInterval(sleepInterval.current);
    };
  }, [isSleeping, regenRate]);

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
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Lit - Niveau {construction.level}</DialogTitle>
            <DialogDescription>
              Régénération: {regenRate} énergie/seconde
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center space-y-4">
            <p>Reposez-vous pour regagner de l'énergie.</p>
            <Button onClick={handleSleep} disabled={playerData.playerState.energie >= 100} className="w-full">
              {playerData.playerState.energie >= 100 ? "Énergie au maximum" : "Dormir"}
            </Button>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:space-x-2 gap-2">
            {hasNextLevel ? (
              <Button onClick={() => setIsUpgradeModalOpen(true)} className="flex-1">
                <ArrowUpCircle className="w-4 h-4 mr-2" /> Améliorer
              </Button>
            ) : (
              <Button disabled className="flex-1">Niv Max</Button>
            )}
            <Button variant="destructive" onClick={() => onDemolish(construction)} className="flex-1">
              <Trash2 className="w-4 h-4 mr-2" /> Détruire
            </Button>
          </DialogFooter>
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
              <span className="text-lg font-bold">{Math.min(100, Math.floor(optimisticEnergy))} / 100</span>
            </div>
            <Progress value={optimisticEnergy} className="h-4" />
          </div>
          <Button onClick={handleWakeUp} className="mt-8">
            Se réveiller
          </Button>
        </div>
      )}
      <BuildingUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        construction={construction}
        onUpdate={refreshPlayerData}
      />
    </>
  );
};

export default BedModal;