import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ItemIcon from "./ItemIcon";
import { InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onUse: () => void;
  source?: 'inventory' | 'chest' | 'crafting' | 'output';
  onTransfer?: (item: InventoryItem, quantity: number, source: 'inventory' | 'chest') => void;
  onTransferToWorkbench?: (item: InventoryItem, quantity: number) => void;
  onTransferFromWorkbench?: (item: InventoryItem, quantity: number) => void;
}

const ItemDetailModal = ({ isOpen, onClose, item, onUse, source, onTransfer, onTransferToWorkbench, onTransferFromWorkbench }: ItemDetailModalProps) => {
  const { getIconUrl, playerData, setPlayerData, refreshPlayerData } = useGame();
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [workbenchTransferQuantity, setWorkbenchTransferQuantity] = useState(1);
  const [splitQuantity, setSplitQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setTransferQuantity(1);
      setWorkbenchTransferQuantity(1);
      setSplitQuantity(1);
    }
  }, [item]);

  if (!item) return null;

  const handleTransferClick = () => {
    if (onTransfer && (source === 'inventory' || source === 'chest')) {
      onTransfer(item, transferQuantity, source);
    }
  };

  const handleTransferToWorkbenchClick = () => {
    if (onTransferToWorkbench) {
      onTransferToWorkbench(item, workbenchTransferQuantity);
    }
  };
  
  const handleTransferFromWorkbenchClick = () => {
    if (onTransferFromWorkbench) {
      onTransferFromWorkbench(item, transferQuantity);
    }
  };

  const handleSplitClick = async () => {
    if (!item) return;
    const originalState = JSON.parse(JSON.stringify(playerData));
    setDetailedItem(null);

    // Optimistic update
    const newInventory = playerData.inventory.map(invItem => 
      invItem.id === item.id ? { ...invItem, quantity: invItem.quantity - splitQuantity } : invItem
    );
    // We can't know the new item's ID or slot, so we'll just let the refresh handle it.
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    onClose();

    const { error } = await supabase.rpc('split_inventory_item', {
      p_inventory_id: item.id,
      p_split_quantity: splitQuantity,
    });
  
    if (error) {
      showError(error.message || "Erreur lors de la division de l'objet.");
      setPlayerData(originalState);
    } else {
      showSuccess("La pile d'objets a été divisée.");
      refreshPlayerData(true);
    }
  };

  const handleReadBlueprint = async () => {
    const originalState = JSON.parse(JSON.stringify(playerData));
    setDetailedItem(null);

    // Optimistic update
    setPlayerData(prev => ({
      ...prev,
      inventory: prev.inventory.filter(invItem => invItem.id !== item.id)
    }));
    onClose();

    const { error } = await supabase.rpc('read_blueprint', { p_inventory_id: item.id });
    if (error) {
      showError(error.message);
      setPlayerData(originalState);
    } else {
      showSuccess("Blueprint appris !");
      refreshPlayerData(true);
    }
  };

  const handleDrop = async (quantityToDrop: number) => {
    if (!item) return;
    const originalState = JSON.parse(JSON.stringify(playerData));
    setDetailedItem(null);

    // Optimistic update
    const newInventory = playerData.inventory
      .map(invItem => {
        if (invItem.id === item.id) {
          return { ...invItem, quantity: invItem.quantity - quantityToDrop };
        }
        return invItem;
      })
      .filter(invItem => invItem.quantity > 0);
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    onClose();

    const action = item.quantity > quantityToDrop ? 'update' : 'delete';
    let rpcPromise;
    if (action === 'delete') {
      rpcPromise = supabase.from('inventories').delete().eq('id', item.id);
    } else {
      rpcPromise = supabase.from('inventories').update({ quantity: item.quantity - quantityToDrop }).eq('id', item.id);
    }

    const { error } = await rpcPromise;
    if (error) {
      showError("Erreur lors de la suppression de l'objet.");
      setPlayerData(originalState);
    } else {
      showSuccess("Objet jeté.");
      refreshPlayerData(true);
    }
  };

  const useActionText = source === 'output' ? 'Récupérer' : item.items?.use_action_text;
  const isBlueprint = item.items?.use_action_text === 'Lire';
  const iconUrl = getIconUrl(item.items?.icon || null);
  const canUse = (source !== 'chest' && useActionText) || source === 'output';
  const canTransfer = !!onTransfer && (source === 'inventory' || source === 'chest');
  const canTransferToWorkbench = !!onTransferToWorkbench && source === 'inventory';
  const canTransferFromWorkbench = !!onTransferFromWorkbench && source === 'crafting';
  const canSplit = source === 'inventory' && item.quantity > 1;

  const handleUseClick = () => {
    if (source === 'output') {
      onUse();
      return;
    }
    if (isBlueprint) {
      handleReadBlueprint();
    } else {
      onUse();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-sonner-toast]')) {
            e.preventDefault();
          }
        }}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6"
      >
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-700/50 border-slate-600 flex-shrink-0 relative p-1">
              <ItemIcon iconName={iconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
            </div>
            <div>
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
                {item.items?.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Détails et actions pour l'objet {item.items?.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {item.items?.description && (
            <p className="text-gray-300">{item.items.description}</p>
          )}
          <p className="text-gray-400">Quantité: <span className="font-bold text-white">{item.quantity}</span></p>
        </div>

        {canTransfer && (
          <div className="w-full space-y-4 rounded-lg bg-slate-700/50 p-4 my-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="quantity-slider">Quantité à transférer</Label>
              <span className="font-mono text-lg font-bold">{transferQuantity}</span>
            </div>
            <Slider
              id="quantity-slider"
              value={[transferQuantity]}
              onValueChange={(value) => setTransferQuantity(value[0])}
              min={1}
              max={item.quantity}
              step={1}
              disabled={item.quantity <= 1}
            />
            <Button onClick={handleTransferClick} className="w-full">
              Transférer {transferQuantity} {source === 'inventory' ? 'vers le coffre' : "vers l'inventaire"}
            </Button>
          </div>
        )}

        {canTransferToWorkbench && (
          <div className="w-full space-y-4 rounded-lg bg-slate-700/50 p-4 my-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="workbench-quantity-slider">Quantité pour l'établi</Label>
              <span className="font-mono text-lg font-bold">{workbenchTransferQuantity}</span>
            </div>
            <Slider
              id="workbench-quantity-slider"
              value={[workbenchTransferQuantity]}
              onValueChange={(value) => setWorkbenchTransferQuantity(value[0])}
              min={1}
              max={item.quantity}
              step={1}
              disabled={item.quantity <= 1}
            />
            <Button onClick={handleTransferToWorkbenchClick} className="w-full">
              Transférer {workbenchTransferQuantity} vers l'établi
            </Button>
          </div>
        )}

        {canTransferFromWorkbench && (
          <div className="w-full space-y-4 rounded-lg bg-slate-700/50 p-4 my-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="quantity-slider">Quantité à transférer</Label>
              <span className="font-mono text-lg font-bold">{transferQuantity}</span>
            </div>
            <Slider
              id="quantity-slider"
              value={[transferQuantity]}
              onValueChange={(value) => setTransferQuantity(value[0])}
              min={1}
              max={item.quantity}
              step={1}
              disabled={item.quantity <= 1}
            />
            <Button onClick={handleTransferFromWorkbenchClick} className="w-full">
              Transférer {transferQuantity} vers l'inventaire
            </Button>
          </div>
        )}

        {canSplit && (
          <div className="w-full space-y-4 rounded-lg bg-slate-700/50 p-4 my-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="split-quantity-slider">Quantité à séparer</Label>
              <span className="font-mono text-lg font-bold">{splitQuantity}</span>
            </div>
            <Slider
              id="split-quantity-slider"
              value={[splitQuantity]}
              onValueChange={(value) => setSplitQuantity(value[0])}
              min={1}
              max={item.quantity - 1}
              step={1}
              disabled={item.quantity <= 1}
            />
            <Button onClick={handleSplitClick} className="w-full">
              Séparer la pile
            </Button>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 pt-4 border-t border-slate-700">
          {canUse && (
            <Button onClick={handleUseClick} className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
              {useActionText}
            </Button>
          )}
          {source !== 'output' && (
            <div className="flex w-full gap-2">
              <Button onClick={() => handleDrop(1)} variant="destructive" className="flex-1 rounded-lg bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 font-bold transition-all">
                Jeter x1
              </Button>
              <Button onClick={() => handleDrop(item.quantity)} variant="destructive" className="flex-1 rounded-lg bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 font-bold transition-all">
                Jeter tout
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailModal;