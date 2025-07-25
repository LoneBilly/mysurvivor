import { useState, useEffect } from 'react';
import { BaseConstruction, BuildingLevel } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Loader2, X, Flame, Heart } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { showError } from '@/utils/toast';
import CampfireActions from './CampfireActions';

interface CampfireModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: () => void;
}

const CampfireModal = ({ isOpen, onClose, construction, onUpdate }: CampfireModalProps) => {
  const { buildingLevels } = useGame();
  const [levelData, setLevelData] = useState<BuildingLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && construction) {
      setLoading(true);
      const currentLevel = buildingLevels.find(l => l.building_type === 'campfire' && l.level === construction.level);
      setLevelData(currentLevel || null);
      setLoading(false);
    }
  }, [isOpen, construction, buildingLevels]);

  if (!isOpen || !construction) return null;

  const maxHp = levelData?.stats?.health ?? 0;
  const currentHp = construction.building_state?.hp ?? maxHp;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl w-full max-w-lg text-white relative" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></Button>
        <div className="flex items-center gap-4 p-6 border-b border-slate-700">
          <div className="w-16 h-16 bg-slate-700/50 rounded-lg flex items-center justify-center">
            <Flame className="w-10 h-10 text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Feu de camp</h2>
            <p className="text-slate-400">Cuisinez de la nourriture et restez au chaud.</p>
            {maxHp > 0 && (
              <div className="flex items-center gap-2 text-sm font-bold text-red-400 bg-black/20 px-2 py-1 rounded-lg mt-2 w-fit">
                <Heart className="w-4 h-4" />
                <span>{currentHp} / {maxHp}</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-6">
          {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : (
            <CampfireActions construction={construction} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CampfireModal;