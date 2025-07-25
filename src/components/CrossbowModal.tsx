import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Target, Loader2, ArrowLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import ItemIcon from './ItemIcon';
import { Badge } from './ui/badge';

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

  const totalInventoryArrows = useMemo(() => {
    return availableArrows.reduce((sum, item) => sum + item.quantity, 0);
  }, [availableArrows]);

  const arrowCount = useMemo(() => {
    return construction?.building_state?.arrow_quantity || 0;
  }, [construction]);

  const isArmed = arrowCount > 0;

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

    await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });

    setLoading(false);
    showSuccess(`${quantity} flèche(s) chargée(s).`);
    await onUpdate(true);
    setView('main');
    setSelectedArrowStack(null);
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

  const renderMainView = () => (
    <div className="py-4 space-y-6 flex flex-col items-center text-center">
      <div className="flex flex-col items-center gap-2">
        <Target className="w-12 h-12 text-gray-400" />
        <h3 className="text-2xl font-bold">{arrowCount} Flèches</h3>
        <Badge variant={isArmed ? "default" : "secondary"} className={isArmed ? "bg-green-600/80" : ""}>
          {isArmed ? "Armée" : "Vide"}
        </Badge>
      </div>
      <div className="w-full space-y-2">
        <Button onClick={() => setView('load')} disabled={totalInventoryArrows === 0} className="w-full">
          <ChevronsRight className="w-4 h-4 mr-2" /> Charger
        </Button>
        <Button onClick={() => setView('unload')} disabled={arrowCount === 0} variant="secondary" className="w-full">
          <ChevronsLeft className="w-4 h-4 mr-2" /> Décharger
        </Button>
      </div>
    </div>
  );

  const renderLoadView = () => {
    return (
      <div className="py-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setView('main'); setSelectedArrowStack(null); }} className="flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft size={16} /> Retour
        </Button>
        
        {!selectedArrowStack ? (
          <div>
            <h3 className="text-center font-semibold mb-4">Choisir un stock de flèches</h3>
            <div className="space-y-2">
              {availableArrows.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setSelectedArrowStack(item)}
                  className="w-full flex items-center gap-4 p-2 bg-slate-700/50 rounded-md border border-slate-600 hover:border-slate-400 transition-colors"
                >
                  <div className="w-12 h-12 bg-slate-900/50 rounded-md flex items-center justify-center flex-shrink-0">
                    <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{item.items?.name}</p>
                    <p className="text-sm text-gray-400">Quantité: {item.quantity}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer le chargement'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderUnloadView = () => (
    <div className="py-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setView('main')} className="flex items-center gap-2 text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> Retour
      </Button>
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
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer le déchargement'}
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
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Arbalète</DialogTitle>
          <DialogDescription>Gérez les munitions de votre arbalète.</DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default CrossbowModal;