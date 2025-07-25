import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Target, Loader2, ArrowDownUp } from 'lucide-react';
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

type ActionState = { type: 'load'; stack: InventoryItem } | { type: 'unload' } | null;

const CrossbowModal = ({ isOpen, onClose, construction, onUpdate }: CrossbowModalProps) => {
  const { getIconUrl, playerData, items } = useGame();
  const [loading, setLoading] = useState(false);
  const [arrowItemId, setArrowItemId] = useState<number | null>(null);
  const [arrowItemIcon, setArrowItemIcon] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [actionState, setActionState] = useState<ActionState>(null);

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

  useEffect(() => {
    if (!isOpen) {
      setActionState(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setQuantity(1);
  }, [actionState]);

  const handleConfirmAction = async () => {
    if (!actionState || !construction) return;
    setLoading(true);

    let error;
    let successMessage = '';

    if (actionState.type === 'load') {
      const { error: loadError } = await supabase.rpc('load_crossbow', {
        p_construction_id: construction.id,
        p_inventory_id: actionState.stack.id,
        p_quantity: quantity,
      });
      if (loadError) {
        error = loadError;
      } else {
        const { error: armError } = await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });
        if (armError) {
          showError(`Flèches chargées, mais l'armement a échoué: ${armError.message}`);
        } else {
          successMessage = `${quantity} flèche(s) chargée(s). Arbalète armée.`;
        }
      }
    } else { // unload
      const { error: unloadError } = await supabase.rpc('unload_crossbow', {
        p_construction_id: construction.id,
        p_quantity: quantity,
      });
      if (unloadError) {
        error = unloadError;
      } else {
        successMessage = `${quantity} flèche(s) déchargée(s).`;
      }
    }

    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      if (successMessage) showSuccess(successMessage);
      await onUpdate(true);
      setActionState(null);
    }
  };

  const renderQuantitySelector = () => {
    if (!actionState) return null;

    const isLoad = actionState.type === 'load';
    const maxQuantity = isLoad ? actionState.stack.quantity : arrowCount;
    const item = isLoad ? actionState.stack.items : { name: 'Flèche', icon: arrowItemIcon };
    const stockLabel = isLoad ? `En stock: ${actionState.stack.quantity}` : `Dans l'arbalète: ${arrowCount}`;

    return (
      <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
            {item?.icon && <ItemIcon iconName={getIconUrl(item.icon)} alt={item.name || ''} />}
          </div>
          <div>
            <p className="font-bold">{item?.name}</p>
            <p className="text-xs text-gray-400">{stockLabel}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="quantity-slider">Quantité à {isLoad ? 'charger' : 'décharger'}</Label>
            <span className="font-mono text-lg font-bold">{quantity}</span>
          </div>
          <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={maxQuantity} step={1} disabled={maxQuantity <= 1} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => setActionState(null)}>Annuler</Button>
          <Button onClick={handleConfirmAction} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
          </Button>
        </div>
      </div>
    );
  };

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
          {actionState ? renderQuantitySelector() : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full space-y-2">
                <h3 className="font-semibold text-gray-300 text-center text-sm">Dans l'arbalète</h3>
                <button 
                  onClick={() => setActionState({ type: 'unload' })}
                  disabled={arrowCount === 0 || loading}
                  className="relative w-24 h-24 mx-auto bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {arrowCount > 0 && arrowItemIcon ? (
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
                <div className="grid grid-cols-4 gap-2 w-full max-w-xs mx-auto min-h-[6.5rem] content-start p-2 bg-black/20 rounded-lg">
                  {availableArrows.map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => setActionState({ type: 'load', stack: item })} 
                      disabled={loading}
                      className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50"
                      title={item.items?.name}
                    >
                      <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                      <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span>
                    </button>
                  ))}
                  {availableArrows.length === 0 && (
                    <div className="col-span-full text-center text-xs text-gray-400 flex items-center justify-center h-full">
                      <p>Aucune flèche.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrossbowModal;