import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { Box, Trash2, Loader2 } from "lucide-react";
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
  const [loadingChest, setLoadingChest] = useState(true);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'chest' } | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; originalIndex: number; source: 'inventory' | 'chest' } | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; target: 'inventory' | 'chest' } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  const inventoryGridRef = useRef<HTMLDivElement | null>(null);
  const chestGridRef = useRef<HTMLDivElement | null>(null);

  const fetchChestContents = useCallback(async () => {
    if (!construction) return;
    setLoadingChest(true);
    const { data, error } = await supabase
      .from('chest_items')
      .select('*, items(*)')
      .eq('chest_id', construction.id);
    
    if (error) {
      showError("Impossible de charger le contenu du coffre.");
    } else {
      setChestItems(data as ChestItem[]);
    }
    setLoadingChest(false);
  }, [construction]);

  useEffect(() => {
    if (isOpen) {
      fetchChestContents();
    } else {
      // Reset D&D state on close
      if (draggedItemNode.current) {
        document.body.removeChild(draggedItemNode.current);
        draggedItemNode.current = null;
      }
      setDraggedItem(null);
      setDragOver(null);
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

    // Optimistic update
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

    let rpcName: string;
    let rpcParams: any;

    if (source === 'inventory') {
      rpcName = 'move_item_to_chest';
      rpcParams = { p_inventory_id: item.id, p_chest_id: construction.id, p_quantity_to_move: quantity, p_target_slot: -1 }; // Target slot will be determined by DB function
    } else {
      rpcName = 'move_item_from_chest';
      rpcParams = { p_chest_item_id: item.id, p_quantity_to_move: quantity, p_target_slot: -1 }; // Target slot will be determined by DB function
    }

    const { error } = await supabase.rpc(rpcName, rpcParams);

    if (error) {
      showError(error.message || "Erreur de transfert.");
      setPlayerData(originalPlayerData);
      setChestItems(originalChestItems);
    } else {
      showSuccess("Transfert réussi.");
      await onUpdate(); // Full refresh for inventory
      await fetchChestContents(); // Full refresh for chest
    }
  };

  const handleDropItem = async (item: InventoryItem, source: 'inventory' | 'chest', quantity: number) => {
    setDetailedItem(null);
    
    // Optimistic update
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
      setPlayerData(originalPlayerData);
      setChestItems(originalChestItems);
    } else {
      showSuccess("Objet jeté.");
      await onUpdate();
      await fetchChestContents();
    }
  };

  const handleDragStart = useCallback((item: InventoryItem, index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent, source: 'inventory' | 'chest') => {
    setDraggedItem({ item, originalIndex: index, source });
    
    const ghostNode = node.querySelector('.item-visual')?.cloneNode(true) as HTMLDivElement;
    if (!ghostNode) return;

    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = `${node.offsetWidth}px`;
    ghostNode.style.height = `${node.offsetHeight}px`;
    ghostNode.style.opacity = '0.85';
    ghostNode.style.transform = 'scale(1.1)';
    document.body.appendChild(ghostNode);
    draggedItemNode.current = ghostNode;

    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    handleDragMove(clientX, clientY);
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    let newDragOver: { index: number; target: 'inventory' | 'chest' } | null = null;
    
    const checkGrid = (gridElement: HTMLDivElement | null, targetType: 'inventory' | 'chest') => {
        if (!gridElement) return null;
        const slotElements = Array.from(gridElement.children);
        for (const slotWrapper of slotElements) {
            const slot = slotWrapper.querySelector('[data-slot-index]') as HTMLElement;
            if (!slot) continue;
            const rect = slot.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                const potentialIndex = parseInt(slot.dataset.slotIndex || '-1', 10);
                if (potentialIndex !== -1) {
                    // Check if slot is unlocked for inventory
                    if (targetType === 'inventory' && potentialIndex >= playerData.playerState.unlocked_slots) {
                        return null; // Cannot drop on locked inventory slot
                    }
                    return { index: potentialIndex, target: targetType };
                }
            }
        }
        return null;
    };

    newDragOver = checkGrid(inventoryGridRef.current, 'inventory') || checkGrid(chestGridRef.current, 'chest');
    
    setDragOver(newDragOver);
  }, [playerData.playerState.unlocked_slots]);

  const handleDragEnd = useCallback(async () => {
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }
  
    if (!draggedItem) {
      setDragOver(null);
      return;
    }

    const { item: fromItem, originalIndex: fromIndex, source: fromSource } = draggedItem;
    const toIndex = dragOver?.index;
    const toTarget = dragOver?.target;
  
    setDraggedItem(null);
    setDragOver(null);
  
    if (!fromItem || toIndex === null || toTarget === undefined) {
        onUpdate(true); // Revert optimistic update if drop was invalid
        fetchChestContents();
        return;
    }

    if (fromSource === toTarget && fromIndex === toIndex) {
        onUpdate(true); // No change, just refresh
        fetchChestContents();
        return;
    }
  
    // Optimistic update
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const originalChestItems = JSON.parse(JSON.stringify(chestItems));

    let newInventory = [...playerData.inventory];
    let newChestItems = [...chestItems];

    const currentFromItem = fromSource === 'inventory' ? newInventory.find(i => i.id === fromItem.id) : newChestItems.find(i => i.id === fromItem.id);
    const currentToItem = toTarget === 'inventory' ? newInventory.find(i => i.slot_position === toIndex) : newChestItems.find(i => i.slot_position === toIndex);

    if (!currentFromItem) { // Item might have been consumed or moved by another action
        onUpdate(true);
        fetchChestContents();
        return;
    }

    // Case: Merge stacks
    if (currentToItem && currentFromItem.item_id === currentToItem.item_id && currentFromItem.items?.stackable) {
        // Remove from source
        if (fromSource === 'inventory') newInventory = newInventory.filter(i => i.id !== currentFromItem.id);
        else newChestItems = newChestItems.filter(i => i.id !== currentFromItem.id);

        // Add to target
        if (toTarget === 'inventory') newInventory = newInventory.map(i => i.id === currentToItem.id ? { ...i, quantity: i.quantity + currentFromItem.quantity } : i);
        else newChestItems = newChestItems.map(i => i.id === currentToItem.id ? { ...i, quantity: i.quantity + currentFromItem.quantity } : i);
    } 
    // Case: Swap or Move to empty slot
    else {
        // Remove from source
        if (fromSource === 'inventory') newInventory = newInventory.filter(i => i.id !== currentFromItem.id);
        else newChestItems = newChestItems.filter(i => i.id !== currentFromItem.id);

        // If target slot was occupied, move its item to the source's original slot
        if (currentToItem) {
            if (toTarget === 'inventory') newInventory = newInventory.filter(i => i.id !== currentToItem.id);
            else newChestItems = newChestItems.filter(i => i.id !== currentToItem.id);

            const itemToSwap = { ...currentToItem, slot_position: fromIndex };
            if (fromSource === 'inventory') newInventory.push(itemToSwap);
            else newChestItems.push(itemToSwap);
        }
        
        // Move original item to target slot
        const movedItem = { ...currentFromItem, slot_position: toIndex };
        if (toTarget === 'inventory') newInventory.push(movedItem);
        else newChestItems.push(movedItem);
    }
  
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    setChestItems(newChestItems);
    // --- END OPTIMISTIC UPDATE ---
  
    let rpcPromise;
    if (fromSource === 'inventory' && toTarget === 'inventory') {
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (fromSource === 'chest' && toTarget === 'chest') {
      if (!construction) return;
      rpcPromise = supabase.rpc('swap_chest_items', { p_chest_id: construction.id, p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (fromSource === 'inventory' && toTarget === 'chest') {
      if (!construction) return;
      rpcPromise = supabase.rpc('move_item_to_chest', { p_inventory_id: fromItem.id, p_chest_id: construction.id, p_quantity_to_move: fromItem.quantity, p_target_slot: toIndex });
    } else if (fromSource === 'chest' && toTarget === 'inventory') {
      rpcPromise = supabase.rpc('move_item_from_chest', { p_chest_item_id: fromItem.id, p_quantity_to_move: fromItem.quantity, p_target_slot: toIndex });
    }
  
    if (rpcPromise) {
      const { error } = await rpcPromise;
      if (error) {
        showError(error.message || "Erreur de transfert.");
        setPlayerData(originalPlayerData); // Revert
        setChestItems(originalChestItems); // Revert
      } else {
        await onUpdate(true); // Final refresh for inventory
        await fetchChestContents(); // Final refresh for chest
      }
    } else {
        onUpdate(true); // If no RPC, still refresh to ensure state consistency
        fetchChestContents();
    }
  }, [draggedItem, dragOver, playerData, chestItems, construction, onUpdate, fetchChestContents]);

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();

    if (draggedItem !== null) {
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

  const renderGrid = (title: string, items: (InventoryItem | null)[], totalSlots: number, type: 'inventory' | 'chest', gridRef: React.RefObject<HTMLDivElement>) => {
    const slots = Array.from({ length: totalSlots }).map((_, index) => {
      return items.find(i => i?.slot_position === index) || null;
    });

    return (
      <div className="flex flex-col h-full">
        <h3 className="text-center font-bold mb-2">{title}</h3>
        <div ref={gridRef} className="flex-grow bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 content-start overflow-y-auto no-scrollbar">
          {loadingChest && type === 'chest' ? (
            <div className="col-span-5 flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : (
            slots.map((item, index) => (
              <div key={index} data-slot-target={type}>
                <InventorySlot
                  item={item}
                  index={index}
                  isUnlocked={type === 'chest' || index < playerData.playerState.unlocked_slots}
                  onDragStart={(item, idx, node, e) => handleDragStart(item, idx, node, e, type)}
                  onItemClick={(clickedItem) => handleItemClick(clickedItem, type)}
                  isBeingDragged={draggedItem?.source === type && draggedItem?.originalIndex === index}
                  isDragOver={dragOver?.target === type && dragOver?.index === index}
                />
              </div>
            ))
          )}
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
            {renderGrid("Contenu du coffre", chestItems, CHEST_SLOTS, 'chest', chestGridRef)}
            {renderGrid("Votre inventaire", playerData.inventory, playerData.playerState.unlocked_slots, 'inventory', inventoryGridRef)}
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
        onDropOne={() => detailedItem && handleDropItem(detailedItem.item, detailedItem.source, 1)}
        onDropAll={() => detailedItem && handleDropItem(detailedItem.item, detailedItem.source, detailedItem.item.quantity)}
        onUse={() => {}}
        onUpdate={() => { onUpdate(true); fetchChestContents(); }}
      />
    </>
  );
};

export default ChestModal;