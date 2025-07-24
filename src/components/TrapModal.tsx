import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { AlertTriangle, Trash2, ArrowUpCircle, Loader2, Shield, Rabbit } from 'lucide-react';
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
  const { buildingLevels, items, getIconUrl } = useGame();
  const [loading, setLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const hasNextLevel = useMemo(() => {
    if (!construction) return false;
    return buildingLevels.some(
      level => level.building_type === construction.type && level.level === construction.level + 1
    );
  }, [construction, buildingLevels]);

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
  const hasLoot = construction.output_item_id !== null;
  const lootItem = hasLoot ? items.find(i => i.id === construction.output_item_id) : null;

  const renderStatus = () => {
    if (hasLoot) {
      return (
        <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Rabbit className="w-8 h-8 text-green-300" />
            <div>
              <p className="font-bold text-lg text-white">Vous avez attrapé quelque chose !</p>
              <p className="text-sm text-gray-300">Le piège est maintenant désarmé.</p>
            </div>
          </div>
          {lootItem && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                <ItemIcon iconName={getIconUrl(lootItem.icon)} alt={lootItem.name} />
              </div>
              <span className="font-semibold">{lootItem.name} x{construction.output_quantity}</span>
            </div>
          )}
          <Button onClick={handleClaimLoot} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Récupérer le butin"}
          </Button>
        </div>
      );
    }

    switch (status) {
      case 'armed':
        return (
          <div className="text-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
            <Shield className="w-8 h-8 mx-auto text-blue-300" />
            <p className="font-bold text-lg text-white">Piège armé et fonctionnel</p>
            <p className="text-sm text-gray-300">Prêt à surprendre les visiteurs indésirables.</p>
          </div>
        );
      case 'triggered_player':
        return (
          <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
            <p className="font-bold text-lg text-white">Piège déclenché !</p>
            <p className="text-sm text-gray-300">Un joueur a été pris dans votre piège. Il doit être réarmé.</p>
            <Button onClick={handleArmTrap} disabled={loading} className="w-full mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Réarmer le piège"}
            </Button>
          </div>
        );
      case 'disarmed':
      default:
        return (
          <div className="text-center p-4 bg-gray-500/10 border border-gray-500/30 rounded-lg space-y-2">
            <p className="font-bold text-lg text-white">Piège désarmé</p>
            <p className="text-sm text-gray-300">Le piège est inactif. Armez-le pour qu'il soit efficace.</p>
            <Button onClick={handleArmTrap} disabled={loading} className="w-full mt-2">
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