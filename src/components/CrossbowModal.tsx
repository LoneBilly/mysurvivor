import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BaseConstruction } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Target, Loader2, ArrowDownUp, Sword } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import ItemIcon from './ItemIcon';

interface CrossbowModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: (silent?: boolean) => Promise<void>;
}

const CrossbowModal = ({ isOpen, onClose, construction, onUpdate }: CrossbowModalProps) => {
  const { getIconUrl, playerData, items, buildingLevels } = useGame();
  const [loadingAction, setLoadingAction] = useState<'load' | 'unload' | null>(null);
  const [arrowItemId, setArrowItemId] = useState<number | null>(null);
  const [arrowItemIcon, setArrowItemIcon] = useState<string | null>(null);

  const crossbowDamage = useMemo(() => {
    if (!construction) return null;
    const levelInfo = buildingLevels.find(
      level => level.building_type === construction.type && level.level === construction.level
    );
    return levelInfo?.stats?.damage || null;
  }, [construction, buildingLevels]);

  useEffect(() => {
    const arrow = items.find(i => i.name === 'Flèche');
    if (arrow) {
      setArrowItemId(arrow.id);
      setArrowItemIcon(arrow.icon);
    }
  }, [items]);

  const availableArrows = useMemo(() => {
    if (!arrowItemId) return [];
    return playerData.inventory.filter(i => i.item_id === arrowItemId && i.slot_position !== null);
  }, [playerData.inventory, arrowItemId]);

  const totalInventoryArrows = useMemo(() => {
    return availableArrows.reduce((sum, item) => sum + item.quantity, 0);
  }, [availableArrows]);

  const arrowCount = useMemo(() => {
    return construction?.building_state?.arrow_quantity || 0;
  }, [construction]);

  const handleLoadArrow = async () => {
    if (loadingAction || !construction || arrowCount >= 1 || availableArrows.length === 0) return;
    
    const inventoryItem = availableArrows[0];
    setLoadingAction('load');
    
    const { error: loadError } = await supabase.rpc('load_crossbow', {
      p_construction_id: construction.id,
      p_inventory_id: inventoryItem.id,
      p_quantity: 1,
    });

    if (loadError) {
      setLoadingAction(null);
      showError(loadError.message);
      return;
    }

    const { error: armError } = await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });
    setLoadingAction(null);

    if (armError) {
      showError(`Flèche chargée, mais l'armement a échoué: ${armError.message}`);
    } else {
      showSuccess(`Flèche chargée. Arbalète armée.`);
    }
    
    await onUpdate(true);
  };

  const handleUnloadArrow = async () => {
    if (loadingAction || !construction || arrowCount === 0) return;
    setLoadingAction('unload');
    const { error } = await supabase.rpc('unload_crossbow', {
      p_construction_id: construction.id,
      p_quantity: 1,
    });
    setLoadingAction(null);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Flèche déchargée.`);
      await onUpdate(true);
    }
  };

  if (!construction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Target className="w-10 h-10 mx-auto text-blue-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Arbalète</DialogTitle>
          <DialogDescription>
            {crossbowDamage ? (
              <span className="flex items-center justify-center gap-2">
                <Sword className="w-4 h-4 text-red-400" /> Dégâts: {crossbowDamage}
              </span>
            ) : (
              "Cliquez sur un stock pour transférer une flèche."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full space-y-2">
              <h3 className="font-semibold text-gray-300 text-center text-sm">Dans l'arbalète</h3>
              <button 
                onClick={handleUnloadArrow}
                disabled={loadingAction !== null || arrowCount === 0}
                className="relative w-24 h-24 mx-auto bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingAction === 'unload' ? <Loader2 className="w-6 h-6 animate-spin" /> : arrowCount > 0 && arrowItemIcon ? (
                  <>
                    <ItemIcon iconName={getIconUrl(arrowItemIcon)} alt="Flèche" />
                    <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{arrowCount}</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Vide</span>
                )}
              </button>
            </div>

            <div className="flex justify-center items-center text-gray-500">
              <ArrowDownUp className="w-6 h-6" />
            </div>

            <div className="w-full space-y-2">
              <h3 className="font-semibold text-gray-300 text-center text-sm">Dans l'inventaire</h3>
              <button 
                onClick={handleLoadArrow}
                disabled={loadingAction !== null || arrowCount >= 1 || totalInventoryArrows === 0}
                className="relative w-24 h-24 mx-auto bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={arrowCount >= 1 ? "Arbalète déjà chargée" : totalInventoryArrows === 0 ? "Aucune flèche" : "Charger une flèche"}
              >
                {loadingAction === 'load' ? <Loader2 className="w-6 h-6 animate-spin" /> : totalInventoryArrows > 0 && arrowItemIcon ? (
                  <>
                    <ItemIcon iconName={getIconUrl(arrowItemIcon)} alt="Flèche" />
                    <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{totalInventoryArrows}</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Aucune</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrossbowModal;