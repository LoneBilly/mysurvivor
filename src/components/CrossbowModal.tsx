import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { TowerControl, Trash2, ArrowUpCircle, Plus, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import BuildingUpgradeModal from './BuildingUpgradeModal';
import ItemIcon from './ItemIcon';
import { Slider } from './ui/slider';
import { Label } from './ui/label';

interface CrossbowModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: (silent?: boolean) => Promise<void>;
}

const CrossbowModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: CrossbowModalProps) => {
  const { playerData, items, buildingLevels, getIconUrl } = useGame();
  const [loading, setLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isAddingAmmo, setIsAddingAmmo] = useState(false);
  const [selectedAmmo, setSelectedAmmo] = useState<InventoryItem | null>(null);
  const [ammoQuantity, setAmmoQuantity] = useState(1);

  const arrowItem = useMemo(() => items.find(item => item.name === 'Flèche'), [items]);
  const availableArrows = useMemo(() => {
    if (!arrowItem) return [];
    return playerData.inventory.filter(item => item.item_id === arrowItem.id && item.slot_position !== null);
  }, [playerData.inventory, arrowItem]);

  const hasNextLevel = useMemo(() => {
    if (!construction) return false;
    return buildingLevels.some(
      level => level.building_type === construction.type && level.level === construction.level + 1
    );
  }, [construction, buildingLevels]);

  useEffect(() => {
    if (!isOpen) {
      setIsAddingAmmo(false);
      setSelectedAmmo(null);
      setAmmoQuantity(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedAmmo) {
      setAmmoQuantity(1);
    }
  }, [selectedAmmo]);

  const handleLoadAmmo = async () => {
    if (!construction || !selectedAmmo) return;
    setLoading(true);
    const { error } = await supabase.rpc('load_crossbow', {
      p_construction_id: construction.id,
      p_inventory_id: selectedAmmo.id,
      p_quantity: ammoQuantity
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`${ammoQuantity} flèche(s) chargée(s).`);
      await onUpdate(true);
      setIsAddingAmmo(false);
      setSelectedAmmo(null);
    }
    setLoading(false);
  };

  const handleArm = async () => {
    if (!construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Arbalète armée !");
      await onUpdate(true);
    }
    setLoading(false);
  };

  if (!construction) return null;

  const arrowCount = construction.building_state?.arrow_quantity || 0;
  const isArmed = construction.building_state?.is_armed || false;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader className="text-center">
            <TowerControl className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Arbalète - Niveau {construction.level}</DialogTitle>
            <DialogDescription>Défense à distance pour votre base.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-black/20 rounded-lg text-center">
              <p className="text-sm text-gray-400">Flèches chargées</p>
              <p className="text-3xl font-bold">{arrowCount}</p>
            </div>

            {isAddingAmmo ? (
              <div className="p-4 bg-white/5 rounded-lg space-y-4">
                {selectedAmmo ? (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                        <ItemIcon iconName={getIconUrl(selectedAmmo.items?.icon)} alt={selectedAmmo.items?.name || ''} />
                      </div>
                      <div>
                        <p className="font-bold">{selectedAmmo.items?.name}</p>
                        <p className="text-xs text-gray-400">En stock: {selectedAmmo.quantity}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Quantité à charger</Label>
                        <span className="font-mono text-lg font-bold">{ammoQuantity}</span>
                      </div>
                      <Slider value={[ammoQuantity]} onValueChange={([val]) => setAmmoQuantity(val)} min={1} max={selectedAmmo.quantity} step={1} disabled={selectedAmmo.quantity <= 1} />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="secondary" onClick={() => setSelectedAmmo(null)}>Changer</Button>
                      <Button onClick={handleLoadAmmo} disabled={loading} className="flex-1">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Charger'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-center text-sm text-gray-400 mb-2">Choisissez une pile de flèches</p>
                    <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto">
                      {availableArrows.map(item => (
                        <button key={item.id} onClick={() => setSelectedAmmo(item)} className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors">
                          <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                          <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span>
                        </button>
                      ))}
                      {availableArrows.length === 0 && <p className="col-span-full text-center text-gray-400 py-4">Aucune flèche dans l'inventaire.</p>}
                    </div>
                    <Button variant="ghost" onClick={() => setIsAddingAmmo(false)} className="w-full mt-2">Annuler</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setIsAddingAmmo(true)} disabled={loading || isArmed} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Charger
                </Button>
                <Button onClick={handleArm} disabled={loading || isArmed || arrowCount === 0} className="flex items-center gap-2">
                  {isArmed ? 'Armée' : <><ShieldCheck className="w-4 h-4" /> Armer</>}
                </Button>
              </div>
            )}
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

export default CrossbowModal;