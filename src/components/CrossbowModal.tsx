import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Target, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import ItemIcon from './ItemIcon';

interface CrossbowModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: (silent?: boolean) => Promise<void>;
}

type ModalView = 'main' | 'load' | 'unload';

const CrossbowModal = ({ isOpen, onClose, construction, onUpdate }: CrossbowModalProps) => {
  const { getIconUrl, playerData, items } = useGame();
  const [loading, setLoading] = useState(false);
  const [arrowItemId, setArrowItemId] = useState<number | null>(null);
  const [arrowItemIcon, setArrowItemIcon] = useState<string | null>(null);
  const [selectedArrowStack, setSelectedArrowStack] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [view, setView] = useState<ModalView>('main');

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

  const arrowCount = useMemo(() => {
    return construction?.building_state?.arrow_quantity || 0;
  }, [construction]);

  const isArmed = useMemo(() => {
    return construction?.building_state?.is_armed || false;
  }, [construction]);

  useEffect(() => {
    if (!isOpen) {
      setView('main');
      setSelectedArrowStack(null);
      setQuantity(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedArrowStack) {
      setQuantity(1);
    }
  }, [selectedArrowStack]);

  const handleLoadArrows = async () => {
    if (!construction || !selectedArrowStack) return;
    setLoading(true);
    const { error } = await supabase.rpc('load_crossbow', {
      p_construction_id: construction.id,
      p_inventory_id: selectedArrowStack.id,
      p_quantity: quantity,
    });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`${quantity} flèche(s) chargée(s).`);
      await onUpdate(true);
      setView('main');
    }
  };

  const handleUnloadArrows = async () => {
    if (!construction || arrowCount === 0) return;
    setLoading(true);
    const { error } = await supabase.rpc('unload_crossbow', {
      p_construction_id: construction.id,
      p_quantity: quantity,
    });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`${quantity} flèche(s) déchargée(s).`);
      await onUpdate(true);
      setView('main');
    }
  };

  const handleArm = async () => {
    if (!construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Arbalète armée.');
      await onUpdate(true);
    }
  };

  const handleSelectStackToLoad = (item: InventoryItem) => {
    setSelectedArrowStack(item);
    setQuantity(1);
    setView('load');
  };

  const handleSelectToUnload = () => {
    if (arrowCount > 0) {
      setQuantity(1);
      setView('unload');
    }
  };

  const renderMainView = () => (
    <div className="py-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-center font-semibold text-gray-300">Arbalète</h3>
          <div className="p-2 bg-black/20 rounded-lg h-full">
            <button 
              onClick={handleSelectToUnload}
              disabled={arrowCount === 0}
              className="relative w-full aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {arrowCount > 0 && arrowItemIcon && (
                <>
                  <ItemIcon iconName={getIconUrl(arrowItemIcon)} alt="Flèche" />
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{arrowCount}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-center font-semibold text-gray-300">Inventaire</h3>
          <div className="p-2 bg-black/20 rounded-lg max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {availableArrows.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => handleSelectStackToLoad(item)} 
                  disabled={loading}
                  className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50"
                  title={item.items?.name}
                >
                  <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span>
                </button>
              ))}
              {availableArrows.length === 0 && <p className="col-span-full text-center text-xs text-gray-400 py-4">Aucune flèche.</p>}
            </div>
          </div>
        </div>
      </div>
      <Button onClick={handleArm} disabled={loading || isArmed || arrowCount === 0} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isArmed ? 'Déjà armée' : 'Armer l\'arbalète'}
      </Button>
    </div>
  );

  const renderLoadView = () => {
    if (!selectedArrowStack) return null;
    return (
      <div className="py-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('main')} className="flex items-center gap-2"><ArrowLeft size={16} /> Retour</Button>
        <div className="space-y-4 p-4 bg-white/5 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
              <ItemIcon iconName={getIconUrl(selectedArrowStack.items?.icon)} alt={selectedArrowStack.items?.name || ''} />
            </div>
            <div>
              <p className="font-bold">{selectedArrowStack.items?.name}</p>
              <p className="text-xs text-gray-400">En stock: {selectedArrowStack.quantity}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="quantity-slider">Quantité à charger</Label>
              <span className="font-mono text-lg font-bold">{quantity}</span>
            </div>
            <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={selectedArrowStack.quantity} step={1} disabled={selectedArrowStack.quantity <= 1} />
          </div>
          <Button onClick={handleLoadArrows} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Charger'}
          </Button>
        </div>
      </div>
    );
  };

  const renderUnloadView = () => (
    <div className="py-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setView('main')} className="flex items-center gap-2"><ArrowLeft size={16} /> Retour</Button>
      <div className="space-y-4 p-4 bg-white/5 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
            {arrowItemIcon && <ItemIcon iconName={getIconUrl(arrowItemIcon)} alt="Flèche" />}
          </div>
          <div>
            <p className="font-bold">Flèche</p>
            <p className="text-xs text-gray-400">Dans l'arbalète: {arrowCount}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="quantity-slider">Quantité à décharger</Label>
            <span className="font-mono text-lg font-bold">{quantity}</span>
          </div>
          <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={arrowCount} step={1} disabled={arrowCount <= 1} />
        </div>
        <Button onClick={handleUnloadArrows} disabled={loading} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Décharger'}
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'load': return renderLoadView();
      case 'unload': return renderUnloadView();
      case 'main':
      default:
        return renderMainView();
    }
  };

  if (!construction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Target className="w-10 h-10 mx-auto text-blue-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Arbalète</DialogTitle>
          <DialogDescription>Défendez votre base contre les intrus.</DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default CrossbowModal;