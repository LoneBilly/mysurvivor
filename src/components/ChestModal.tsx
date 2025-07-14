import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { Box, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemDetailModal from "./ItemDetailModal";

const CHEST_SLOTS = 10;

interface ChestItem extends InventoryItem {}

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const ChestModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: ChestModalProps) => {
  const { playerData, setPlayerData } = useGame();
  const [chestItems, setChestItems] = useState<ChestItem[]>([]);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'chest' } | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ index: number; source: 'inventory' | 'chest' } | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; target: 'inventory' | 'chest' } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  const fetchChestContents = useCallback(async () => {
    if (!construction) return;
    const { data, error } = await supabase
      .from('chest_items')
      .select('*, items(*)')
      .eq('chest_id', construction.id);
    
    if (error) {
      showError("Impossible de charger le contenu du coffre.");
    } else {
      setChestItems(data as ChestItem[]);
    }
  }, [construction]);

  useEffect(() => {
    if (isOpen) {
      fetchChestContents();
    }
  }, [isOpen, fetchChestContents]);

  const handleDemolishClick = () => {
    onDemolish(construction!);
  };

  const handleItemClick = (item: InventoryItem, source: 'inventory' | 'chest') => {
    if (item) {
      setDetailedItem({ item, source });
    }
  };

  const handleTransfer = async (item: InventoryItem, quantity: number, source: 'inventory' | 'chest') => {
    if (!construction) return;
    setDetailedItem(null);

    // --- START OPTIMISTIC UPDATE ---
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const originalChestItems = JSON.parse(JSON.stringify(chestItems));

    if (source === 'inventory') {
        const newInventory = playerData.inventory.map(invItem => {
            if (invItem.id === item.id) {
                return { ...invItem, quantity: invItem.quantity - quantity };
            }
            return invItem;
        }).filter(invItem => invItem.quantity > 0);
        setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    } else { // source === 'chest'
        const newChestItems = chestItems.map(chestItem => {
            if (chestItem.id === item.id) {
                return { ...chestItem, quantity: chestItem.quantity - quantity };
            }
            return chestItem;
        }).filter(chestItem => chestItem.quantity > 0);
        setChestItems(newChestItems);
    }
    // --- END OPTIMISTIC UPDATE ---

    let rpcName: string;
    let rpcParams: any;

    if (source === 'inventory') {
      rpcName = 'move_item_to_chest';
      rpcParams = { p_inventory_id: item.id, p_chest_id: construction.id, p_quantity_to_move: quantity };
    } else {
      rpcName = 'move_item_from_chest';
      rpcParams = { p_chest_item_id: item.id, p_quantity_to_move: quantity };
    }

    const { error } = await supabase.rpc(rpcName, rpcParams);

    if (error) {
      showError(error.message || "Erreur de transfert.");
      // Revert on error
      setPlayerData(originalPlayerData);
      setChestItems(originalChestItems);
    } else {
      showSuccess("Transfert réussi.");
      // Refresh state from server to get the destination updated correctly
      await onUpdate();
      await fetchChestContents();
    }
  };

  const handleDrop = async (item: InventoryItem, source: 'inventory' | 'chest', quantity: number) => {
    setDetailedItem(null);
    let rpcPromise;
    if (source === 'chest') {
      rpcPromise = supabase.rpc('drop_chest_item', { p_chest_item_id: item.id, p_quantity_to_drop: quantity });
    } else {
      const action = item.quantity > quantity ? 'update' : 'delete';
      if (action === 'delete') {
        rpcPromise = supabase.from('inventories').delete().eq('id', item.id);
      } else {
        rpcPromise = supabase.from('inventories').update({ quantity: item.quantity - quantity }).eq('id', item.id);
      }
    }
    
    const { error } = await rpcPromise;
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet jeté.");
      await onUpdate();
      await fetchChestContents();
    }
  };

  const handleDragStart = (index: number, source: 'inventory' | 'chest', node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItem({ index, source });
    
    const ghostNode = node.querySelector('.item-visual')?.cloneNode(true) as HTMLDivElement;
    if (!ghostNode) return;

    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = '56px';
    ghostNode.style.height = '56px';
    ghostNode.style.opacity = '0.85';
    ghostNode.style.transform = 'scale(1.1)';
    document.body.appendChild(ghostNode);
    draggedItemNode.current = ghostNode;

    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    handleDragMove(clientX, clientY);
  };

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index'));
    
    if (slotElement) {
      const index = parseInt(slotElement.getAttribute('data-slot-index') || '-1', 10);
      const targetElement = (slotElement as HTMLElement).closest('[data-slot-target]');
      const target = targetElement?.getAttribute('data-slot-target') as 'inventory' | 'chest' | undefined;

      if (index !== -1 && target) {
        setDragOver({ index, target });
        return;
      }
    }
    setDragOver(null);
  }, []);

  const handleDragEnd = async () => {
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }
  
    if (!draggedItem || !dragOver) {
      setDraggedItem(null);
      setDragOver(null);
      return;
    }
  
    const { source, index: fromIndex } = draggedItem;
    const { target, index: toIndex } = dragOver;
  
    setDraggedItem(null);
    setDragOver(null);
  
    if (source === target && fromIndex === toIndex) return;
  
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const originalChestItems = JSON.parse(JSON.stringify(chestItems));
  
    // --- START OPTIMISTIC UPDATE ---
    let newInventory = [...playerData.inventory];
    let newChestItems = [...chestItems];
    let rpcPromise;
  
    const fromItem = source === 'inventory' ? newInventory.find(i => i.slot_position === fromIndex) : newChestItems.find(i => i.slot_position === fromIndex);
    const toItem = target === 'inventory' ? newInventory.find(i => i.slot_position === toIndex) : newChestItems.find(i => i.slot_position === toIndex);
  
    if (!fromItem) return;
  
    // Case 1: Merge
    if (toItem && fromItem.item_id === toItem.item_id && fromItem.items?.stackable) {
      if (source === 'inventory') newInventory = newInventory.filter(i => i.id !== fromItem.id);
      else newChestItems = newChestItems.filter(i => i.id !== fromItem.id);
  
      if (target === 'inventory') newInventory = newInventory.map(i => i.id === toItem.id ? { ...i, quantity: i.quantity + fromItem.quantity } : i);
      else newChestItems = newChestItems.map(i => i.id === toItem.id ? { ...i, quantity: i.quantity + fromItem.quantity } : i);
    } 
    // Case 2: Swap/Move
    else {
      const fromItemInSourceIdx = source === 'inventory' ? newInventory.findIndex(i => i.id === fromItem.id) : newChestItems.findIndex(i => i.id === fromItem.id);
      const [movedItem] = source === 'inventory' ? newInventory.splice(fromItemInSourceIdx, 1) : newChestItems.splice(fromItemInSourceIdx, 1);
      movedItem.slot_position = toIndex;
  
      if (toItem) {
        const toItemInTargetIdx = target === 'inventory' ? newInventory.findIndex(i => i.id === toItem.id) : newChestItems.findIndex(i => i.id === toItem.id);
        const [itemToSwap] = target === 'inventory' ? newInventory.splice(toItemInTargetIdx, 1) : newChestItems.splice(toItemInTargetIdx, 1);
        itemToSwap.slot_position = fromIndex;
        if (source === 'inventory') newInventory.push(itemToSwap);
        else newChestItems.push(itemToSwap);
      }
  
      if (target === 'inventory') newInventory.push(movedItem);
      else newChestItems.push(movedItem);
    }
  
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    setChestItems(newChestItems);
    // --- END OPTIMISTIC UPDATE ---
  
    if (source === 'inventory' && target === 'inventory') {
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (source === 'chest' && target === 'chest') {
      if (!construction) return;
      rpcPromise = supabase.rpc('swap_chest_items', { p_chest_id: construction.id, p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (source === 'inventory' && target === 'chest') {
      const itemToMove = originalPlayerData.inventory.find(i => i.slot_position === fromIndex);
      if (!itemToMove || !construction) return;
      rpcPromise = supabase.rpc('move_item_to_chest', { p_inventory_id: itemToMove.id, p_chest_id: construction.id, p_quantity_to_move: itemToMove.quantity, p_target_slot: toIndex });
    } else if (source === 'chest' && target === 'inventory') {
      const itemToMove = originalChestItems.find(i => i.slot_position === fromIndex);
      if (!itemToMove) return;
      rpcPromise = supabase.rpc('move_item_from_chest', { p_chest_item_id: itemToMove.id, p_quantity_to_move: itemToMove.quantity, p_target_slot: toIndex });
    }
  
    if (rpcPromise) {
      const { error } = await rpcPromise;
      if (error) {
        showError(error.message || "Erreur de transfert.");
        setPlayerData(originalPlayerData);
        setChestItems(originalChestItems);
      } else {
        await onUpdate(true);
        await fetchChestContents();
      }
    }
  };

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();

    if (draggedItem) {
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', endHandler);
      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('touchend', endHandler);
    }

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', endHandler);
    };
  }, [draggedItem, handleDragMove, handleDragEnd]);

  const renderGrid = (title: string, items: (InventoryItem | null)[], totalSlots: number, type: 'inventory' | 'chest') => {
    const slots = Array.from({ length: totalSlots }).map((_, index) => {
      return items.find(i => i?.slot_position === index) || null;
    });

    return (
      <div className="flex flex-col">
        <h3 className="text-center font-bold mb-2">{title}</h3>
        <div className="flex-grow bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 content-start">
          {slots.map((item, index) => (
            <div key={index} data-slot-target={type}>
              <InventorySlot
                item={item}
                index={index}
                isUnlocked={type === 'chest' || index < playerData.playerState.unlocked_slots}
                onDragStart={(idx, node, e) => handleDragStart(idx, type, node, e)}
                onItemClick={(clickedItem) => handleItemClick(clickedItem, type)}
                isBeingDragged={draggedItem?.source === type && draggedItem?.index === index}
                isDragOver={dragOver?.target === type && dragOver?.index === index}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!construction) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Box className="w-7 h-7 text-white" />
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Coffre</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
              Stockez vos objets en sécurité.
            </DialogDescription>
          </DialogHeader>
          <div className="relative flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 min-h-0">
            {renderGrid("Contenu du coffre", chestItems, CHEST_SLOTS, 'chest')}
            {renderGrid("Votre inventaire", playerData.inventory, playerData.playerState.unlocked_slots, 'inventory')}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="destructive" onClick={handleDemolishClick}>
              <Trash2 className="w-4 h-4 mr-2" />
              Détruire le coffre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ItemDetailModal
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        item={detailedItem?.item || null}
        source={detailedItem?.source}
        onTransfer={handleTransfer}
        onDropOne={() => detailedItem && handleDrop(detailedItem.item, detailedItem.source, 1)}
        onDropAll={() => detailedItem && handleDrop(detailedItem.item, detailedItem.source, detailedItem.item.quantity)}
        onUse={() => {}}
      />
    </>
  );
};

export default ChestModal;