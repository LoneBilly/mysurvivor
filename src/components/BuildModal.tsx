import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGame } from '@/contexts/GameContext';
import { Button } from './ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import DynamicIcon from './DynamicIcon';

interface BuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  coords: { x: number; y: number };
}

const getConstructionIcon = (type: string) => {
  switch (type) {
    case 'foundation': return 'Square';
    case 'workbench': return 'Hammer';
    case 'chest': return 'Box';
    case 'campfire': return 'Flame';
    case 'lit': return 'BedDouble';
    default: return 'Home';
  }
};

const BuildModal = ({ isOpen, onClose, coords }: BuildModalProps) => {
  const { buildingLevels, addConstructionJob, refreshBaseState, playerData } = useGame();
  const [isBuilding, setIsBuilding] = useState(false);

  const availableBuildings = useMemo(() => {
    const buildingTypes = new Set(buildingLevels.map(bl => bl.building_type));
    buildingTypes.delete('foundation');
    return Array.from(buildingTypes);
  }, [buildingLevels]);

  const isJobRunning = playerData.constructionJobs && playerData.constructionJobs.length > 0;

  const handleBuild = async (buildingType: string) => {
    setIsBuilding(true);
    const { data, error } = await supabase.rpc('start_building_on_foundation', {
      p_x: coords.x,
      p_y: coords.y,
      p_building_type: buildingType,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Construction de ${buildingType} lancée !`);
      if (data && data.length > 0) {
        addConstructionJob(data[0]);
      }
      refreshBaseState();
      onClose();
    }
    setIsBuilding(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/90 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Construire un bâtiment</DialogTitle>
          <DialogDescription>Choisissez ce que vous voulez construire sur cette fondation.</DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {availableBuildings.map(type => (
            <Button
              key={type}
              variant="outline"
              className="h-24 flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700"
              onClick={() => handleBuild(type)}
              disabled={isBuilding || isJobRunning}
            >
              {isBuilding ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <DynamicIcon name={getConstructionIcon(type)} className="w-8 h-8" />
                  <span className="capitalize">{type}</span>
                </>
              )}
            </Button>
          ))}
        </div>
        {isJobRunning && <p className="text-center text-yellow-400 text-sm mt-2">Vous avez déjà une construction en cours.</p>}
      </DialogContent>
    </Dialog>
  );
};

export default BuildModal;