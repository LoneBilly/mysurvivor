import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, Item } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { AlertTriangle, Trash2, ArrowUpCircle, Rabbit, UserX, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import BuildingUpgradeModal from './BuildingUpgradeModal';
import ItemIcon from './ItemIcon';

interface TrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: (silent?: boolean) => Promise<void>;
}

const TrapModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: TrapModalProps) => {
  const { items, buildingLevels, getIconUrl } = useGame();
  const [loading, setLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const hasNextLevel = useMemo(() => {
    if (!construction) return false;
    return buildingLevels.some(
      level => level.building_type === construction.type && level.level === construction.level + 1
    );
  }, [construction, buildingLevels]);

  const lootItem = useMemo(() => {
    if (!construction?.output_item_id) return null;
    return items.find(item => item.id === construction.output_item_id);
  }, [construction, items]);

  const handleArmTrap = async () => {
    if (!construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('arm_trap', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Piège armé !");
      await onUpdate(true);
    }
    setLoading(false);
  };

  const handleClaimLoot = async () => {
    if (!construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('claim_trap_loot', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Butin récupéré !");
      await onUpdate(true);
    }
    setLoading(false);
  };

  if (!construction) return null;

  const status = construction.building_state?.status;

  const renderStatus = () => {
    if (lootItem) {
      return (
        <div className="text-center space-y-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <Rabbit className="w-12 h-12 mx-auto text-green-400" />
          <h3 className="text-lg font-bold">Un animal a été attrapé !</h3>
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
              <ItemIcon iconName={getIconUrl(lootItem.icon)} alt={lootItem.name} />
            </div>
            <p>Vous avez obtenu: {lootItem.name} x1</p>
          </div>
          <Button onClick={handleClaimLoot} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Récupérer le butin"}
          </Button>
        </div>
      );
    }

    switch (status) {
      case 'armed':
        return (
          <div className="text-center space-y-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="font-semibold text-blue-300">Le piège est armé et prêt à se déclencher.</p>
            <Button disabled className="w-full">Armé</Button>
          </div>
        );
      case 'triggered_player':
        return (
          <div className="text-center space-y-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <UserX className="w-12 h-12 mx-auto text-red-400" />
            <h3 className="text-lg font-bold">Un joueur a déclenché le piège !</h3>
            <Button onClick={handleArmTrap} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Réarmer le piège"}
            </Button>
          </div>
        );
      case 'disarmed':
      default:
        return (
          <div className="text-center space-y-4">
            <p>Le piège est actuellement inactif.</p>
            <Button onClick={handleArmTrap} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Armer le piège"}
            </Button>
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader className="text-center">
            <AlertTriangle className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Piège - Niveau {construction.level}</DialogTitle>
            <DialogDescription>Un dispositif simple mais efficace.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderStatus()}
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
      <BuildingUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        construction={construction}
        onUpdate={onUpdate}
        onUpgradeComplete={onClose}
      />
    </>
  );
};

export default TrapModal;