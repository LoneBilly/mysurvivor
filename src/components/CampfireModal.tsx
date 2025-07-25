import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BaseConstruction } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import BuildingHealth from './BuildingHealth';
import { Loader2, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface CampfireModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: () => void;
}

const CampfireModal = ({ isOpen, onClose, construction, onUpdate }: CampfireModalProps) => {
  const { buildingLevels } = useGame();
  const [isRepairing, setIsRepairing] = useState(false);

  if (!construction) return null;

  const levelData = buildingLevels.find(l => l.building_type === construction.type && l.level === construction.level);
  const maxHp = levelData?.stats?.health;
  const currentHp = construction.building_state?.hp ?? maxHp;
  const isDamaged = typeof currentHp === 'number' && typeof maxHp === 'number' && currentHp < maxHp;

  const handleRepair = async () => {
    setIsRepairing(true);
    const { error } = await supabase.rpc('repair_building', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Bâtiment réparé !");
      onUpdate();
      onClose();
    }
    setIsRepairing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Feu de camp (Niveau {construction.level})</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <BuildingHealth currentHp={currentHp} maxHp={maxHp} />
          <div className="text-center text-slate-400 p-8 border border-dashed border-slate-600 rounded-lg">
            La gestion du feu de camp sera affichée ici.
          </div>
        </div>
        <DialogFooter>
          {isDamaged && (
            <Button onClick={handleRepair} disabled={isRepairing}>
              {isRepairing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
              Réparer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampfireModal;