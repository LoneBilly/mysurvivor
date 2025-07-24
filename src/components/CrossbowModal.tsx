import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Crosshair, Trash2, ArrowUpCircle, Loader2, Shield, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
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
  const { playerData, buildingLevels, getIconUrl } = useGame();
  const [loading, setLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedArrowStack, setSelectedArrowStack] = useState<InventoryItem | null>(null);
  const [arrowQuantity, setArrowQuantity] = useState(1);

  const hasNextLevel = useMemo(() => {
    if (!construction) return false;
    return buildingLevels.some(
      level => level.building_type === construction.type && level.level === construction.level + 1
    );
  }, [construction, buildingLevels]);

  const arrowStacks = useMemo(() => {
    return playerData.inventory.filter(item => item.items?.name === 'Flèche');
  }, [playerData.inventory]);

  const currentArrows = construction?.building_state?.arrow_quantity || 0;
  const isArmed = construction?.building_state?.is_armed || false;

  useEffect(() => {
    if (selectedArrowStack) {
      setArrowQuantity(1);
    }
  }, [selectedArrowStack]);

  const handleRotate = async (direction: number) => {
    if (!construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('rotate_building', { p_construction_id: construction.id, p_direction: direction });
    if (error) showError(error.message);
    else {
      showSuccess("Arbalète tournée !");
      await onUpdate(true);
    }
    setLoading(false);
  };

  const handleLoadArrows = async () => {
    if (!construction || !selectedArrowStack) return;
    setLoading(true);
    const { error } = await supabase.rpc('load_crossbow', {
      p_construction_id: construction.id,
      p_inventory_id: selectedArrowStack.id,
      p_quantity: arrowQuantity
    });
    if (error) showError(error.message);
    else {
      showSuccess(`${arrowQuantity} flèche(s) chargée(s).`);
      await onUpdate(true);
      setSelectedArrowStack(null);
    }
    setLoading(false);
  };

  const handleArm = async () => {
    if (!construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });
    if (error) showError(error.message);
    else {
      showSuccess("Arbalète armée !");
      await onUpdate(true);
    }
    setLoading(false);
  };

  if (!construction) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader className="text-center">
            <Crosshair className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Arbalète - Niveau {construction.level}</DialogTitle>
            <DialogDescription>Défense à distance.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-center p-4 bg-black/20 rounded-lg">
              <p className="text-sm text-gray-400">Flèches chargées</p>
              <p className="text-3xl font-bold font-mono text-white">{currentArrows}</p>
              {isArmed ? (
                <p className="text-sm font-bold text-green-400">ARMÉE</p>
              ) : (
                <p className="text-sm text-yellow-400">DÉSARMÉE</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Rotation</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button onClick={() => handleRotate(2)} variant={construction.rotation === 2 ? "default" : "outline"} disabled={loading}><ArrowUp /></Button>
                <Button onClick={() => handleRotate(1)} variant={construction.rotation === 1 ? "default" : "outline"} disabled={loading}><ArrowLeft /></Button>
                <Button onClick={() => handleRotate(0)} variant={construction.rotation === 0 ? "default" : "outline"} disabled={loading}><ArrowDown /></Button>
                <Button onClick={() => handleRotate(3)} variant={construction.rotation === 3 ? "default" : "outline"} disabled={loading}><ArrowRight /></Button>
              </div>
            </div>

            {selectedArrowStack ? (
              <div className="p-3 bg-white/5 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Quantité à charger</Label>
                  <span className="font-mono font-bold">{arrowQuantity}</span>
                </div>
                <Slider value={[arrowQuantity]} onValueChange={([val]) => setArrowQuantity(val)} min={1} max={selectedArrowStack.quantity} step={1} />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setSelectedArrowStack(null)}>Annuler</Button>
                  <Button onClick={handleLoadArrows} disabled={loading} className="flex-1">Charger</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Charger des flèches</Label>
                <div className="grid grid-cols-4 gap-2">
                  {arrowStacks.map(stack => (
                    <button key={stack.id} onClick={() => setSelectedArrowStack(stack)} className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors">
                      <ItemIcon iconName={getIconUrl(stack.items?.icon)} alt="Flèche" />
                      <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{stack.quantity}</span>
                    </button>
                  ))}
                  {arrowStacks.length === 0 && <p className="col-span-4 text-center text-sm text-gray-400">Aucune flèche dans l'inventaire.</p>}
                </div>
              </div>
            )}

            {!isArmed && currentArrows > 0 && (
              <Button onClick={handleArm} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Armer l'arbalète"}
              </Button>
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