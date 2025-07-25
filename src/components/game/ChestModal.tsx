import { useState, useEffect } from 'react';
import { BaseConstruction, BuildingLevel } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Loader2, X, Box, Trash2, Heart } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import ChestInventory from './ChestInventory';

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const ChestModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: ChestModalProps) => {
  const { buildingLevels } = useGame();
  const [levelData, setLevelData] = useState<BuildingLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && construction) {
      setLoading(true);
      const currentLevel = buildingLevels.find(l => l.building_type === 'chest' && l.level === construction.level);
      setLevelData(currentLevel || null);
      setLoading(false);
    }
  }, [isOpen, construction, buildingLevels]);

  if (!isOpen || !construction) return null;

  const maxHp = levelData?.stats?.health ?? 0;
  const currentHp = construction.building_state?.hp ?? maxHp;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl w-full max-w-4xl text-white relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center">
              <Box className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Coffre - Niveau {construction.level}</h2>
              {maxHp > 0 && (
                <div className="flex items-center gap-2 text-sm font-bold text-red-400 bg-black/20 px-2 py-1 rounded-lg mt-1 w-fit">
                  <Heart className="w-4 h-4" />
                  <span>{currentHp} / {maxHp}</span>
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></Button>
        </div>
        <div className="p-4 flex-grow overflow-y-auto">
          {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : (
            <ChestInventory construction={construction} onUpdate={onUpdate} />
          )}
        </div>
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <Button variant="destructive" onClick={() => onDemolish(construction)} className="w-full">
            <Trash2 className="w-4 h-4 mr-2" /> Démolir le coffre
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChestModal;