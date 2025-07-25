import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Target, Loader2, ChevronsDownUp } from 'lucide-react';
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

const CrossbowModal = ({ isOpen, onClose, construction, onUpdate }: CrossbowModalProps) => {
  const { getIconUrl, playerData, items } = useGame();
  const [loading, setLoading] = useState(false);
  const [arrowItemId, setArrowItemId] = useState<number | null>(null);
  const [arrowItemIcon, setArrowItemIcon] = useState<string | null>(null);
  const [selectedArrowStack, setSelectedArrowStack] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<'load' | 'unload' | null>(null);

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

  useEffect(() => {
    if (!isOpen) {
      setMode(null);
      setSelectedArrowStack(null);
      setQuantity(1);
    }
  }, [isOpen]);

  const handleLoad = async () => {
    if (!construction || !selectedArrowStack) return;
    setLoading(true);
    
    const { error: loadError } = await supabase.rpc('load_crossbow', {
      p_construction_id: construction.id,
      p_inventory_id: selectedArrowStack.id,
      p_quantity: quantity,
    });

    if (loadError) {
      setLoading(false);
      showError(loadError.message);
      return;
    }

    const { error: armError } = await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });
    setLoading(false);

    if (armError) {
      showError(`Flèches chargées, mais l'armement a échoué: ${armError.message}`);
    } else {
      showSuccess(`${quantity} flèche(s) chargée(s). Arbalète armée.`);
    }
    
    await onUpdate(true);
    setMode(null);
    setSelectedArrowStack(null);
  };

  const handleUnload = async () => {
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
      setMode(null);
    }
  };

  const renderLoadSelector = () => (
    <div className="space-y-3">
      <p className="text-sm text-center text-gray-300">Choisir un stock de flèches à charger :</p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 w-full max-w-xs mx-auto content-start">
        {availableArrows.map(item => (
          <button 
            key={item.id} 
            onClick={() => {
              setSelectedArrowStack(item);
              setQuantity(1);
            }} 
            className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors"
          >
            <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
            <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderQuantitySelector = (maxQuantity: number, action: 'load' | 'unload') => (
    <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="quantity-slider">Quantité à {action === 'load' ? 'charger' : 'décharger'}</Label>
          <span className="font-mono text-lg font-bold">{quantity}</span>
        </div>
        <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={maxQuantity} step={1} disabled={maxQuantity <= 1} />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => { setMode(null); setSelectedArrowStack(null); }}>Annuler</Button>
        <Button onClick={action === 'load' ? handleLoad : handleUnload} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
        </Button>
      </div>
    </div>
  );

  if (!construction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Target className="w-10 h-10 mx-auto text-blue-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Arbalète</DialogTitle>
          <DialogDescription>Transférez les flèches entre l'arbalète et votre inventaire.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-900/70 border border-slate-700">
            <h3 className="font-semibold text-gray-300">Dans l'arbalète</h3>
            <div className="relative w-20 h-20 bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600">
              {arrowCount > 0 && arrowItemIcon ? (
                <>
                  <ItemIcon iconName={getIconUrl(arrowItemIcon)} alt="Flèche" />
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{arrowCount}</span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Vide</span>
              )}
            </div>
          </div>

          {mode === null && (
            <div className="flex justify-center items-center gap-4 px-4 py-2">
              <Button onClick={() => { setMode('load'); setQuantity(1); }} disabled={totalInventoryArrows === 0} className="flex-1">Charger</Button>
              <ChevronsDownUp className="w-6 h-6 text-gray-500 flex-shrink-0" />
              <Button onClick={() => { setMode('unload'); setQuantity(1); }} disabled={arrowCount === 0} className="flex-1">Décharger</Button>
            </div>
          )}

          {mode === 'load' && !selectedArrowStack && renderLoadSelector()}
          {mode === 'load' && selectedArrowStack && renderQuantitySelector(selectedArrowStack.quantity, 'load')}
          {mode === 'unload' && renderQuantitySelector(arrowCount, 'unload')}

          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-900/70 border border-slate-700">
            <h3 className="font-semibold text-gray-300">Flèches dans l'inventaire</h3>
            <div className="relative w-20 h-20 bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600">
              {totalInventoryArrows > 0 && arrowItemIcon ? (
                <>
                  <ItemIcon iconName={getIconUrl(arrowItemIcon)} alt="Flèche" />
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{totalInventoryArrows}</span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Aucune</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrossbowModal;