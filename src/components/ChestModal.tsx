import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, ChestItem as ChestItemType } from "@/types/game";
import { Box, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemDetailModal from "./ItemDetailModal";

const CHEST_SLOTS = 10;

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const ChestModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: ChestModalProps) => {
  const { playerData, setPlayerData, refreshInventoryAndChests } = useGame();
  const [chestItems, setChestItems] = useState<ChestItemType[]>([]);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'chest' } | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ index: number; source: 'inventory' | 'chest' } | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; target: 'inventory' | 'chest' } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && construction) {
      const itemsInChest = playerData.chestItems?.filter(item => item.chest_id === construction.id) || [];
      setChestItems(itemsInChest);
    }
  }, [isOpen, construction, playerData.chestItems]);


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

    let rpcName: string;
    let rpcParams: any;

    if (source === 'inventory') {
      rpcName = 'move_item_to_chest';
      rpcParams = { p_inventory_id: item.id, p_chest_id: construction.id, p_quantity_to_move: quantity, p_target_slot: null };
    } else {
      rpcName = 'move_item_from_chest';
      rpcParams = { p_chest_item_id: item.id, p_quantity_to_move: quantity, p_target_slot: null };
    }

    const { error } = await supabase.rpc(rpcName, rpcParams);

    if (error) {
      showError(error.message || "Erreur de transfert.");
    } else {
      showSuccess("Transfert réussi.");
      await refreshInventoryAndChests();
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
      await refreshInventoryAndChests();
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
    let optimisticData = JSON.parse(JSON.stringify(playerData));
    let rpcPromise;
  
    const fromItemInv = source === 'inventory' ? optimisticData.inventory.find((i: InventoryItem) => i.slot_position === fromIndex) : null;
    const fromItemChest = source === 'chest' ? optimisticData.chestItems.find((i: ChestItemType) => i.chest_id === construction?.id && i.slot_position === fromIndex) : null;
    const toItemInv = target === 'inventory' ? optimisticData.inventory.find((i: InventoryItem) => i.slot_position === toIndex) : null;
    const toItemChest = target === 'chest' ? optimisticData.chestItems.find((i: ChestItemType) => i.chest_id === construction?.id && i.slot_position === toIndex) : null;
  
    try {
      if (source === 'inventory' && target === 'inventory') {
        if (fromItemInv) {
          if (toItemInv) {
            if (fromItemInv.item_id === toItemInv.item_id && fromItemInv.items?.stackable) {
              toItemInv.quantity += fromItemInv.quantity;
              optimisticData.inventory = optimisticData.inventory.filter((i: InventoryItem) => i.id !== fromItemInv.id);
            } else {
              toItemInv.slot_position = fromIndex;
              fromItemInv.slot_position = toIndex;
            }
          } else {
            fromItemInv.slot_position = toIndex;
          }
        }
        rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
      } else if (source === 'chest' && target === 'chest') {
        if (fromItemChest) {
          if (toItemChest) {
            if (fromItemChest.item_id === toItemChest.item_id && fromItemChest.items?.stackable) {
              toItemChest.quantity += fromItemChest.quantity;
              optimisticData.chestItems = optimisticData.chestItems.filter((i: ChestItemType) => i.id !== fromItemChest.id);
            } else {
              toItemChest.slot_position = fromIndex;
              fromItemChest.slot_position = toIndex;
            }
          } else {
            fromItemChest.slot_position = toIndex;
          }
        }
        rpcPromise = supabase.rpc('swap_chest_items', { p_chest_id: construction.id, p_from_slot: fromIndex, p_to_slot: toIndex });
      } else if (source === 'inventory' && target === 'chest') {
        if (!fromItemInv || !construction) return;
        if (toItemChest) {
            if (fromItemInv.item_id === toItemChest.item_id && fromItemInv.items?.stackable) {
                toItemChest.quantity += fromItemInv.quantity;
                optimisticData.inventory = optimisticData.inventory.filter((i: InventoryItem) => i.id !== fromItemInv.id);
            } else {
                const fromInvIndex = optimisticData.inventory.findIndex((i: InventoryItem) => i.id === fromItemInv.id);
                const toChestIndex = optimisticData.chestItems.findIndex((i: ChestItemType) => i.id === toItemChest.id);
                const tempFrom = { ...optimisticData.inventory[fromInvIndex] };
                const tempTo = { ...optimisticData.chestItems[toChestIndex] };
                optimisticData.inventory[fromInvIndex] = { ...tempTo, slot_position: fromIndex };
                optimisticData.chestItems[toChestIndex] = { ...tempFrom, slot_position: toIndex, chest_id: construction.id };
            }
        } else {
            optimisticData.inventory = optimisticData.inventory.filter((i: InventoryItem) => i.id !== fromItemInv.id);
            optimisticData.chestItems.push({ ...fromItemInv, slot_position: toIndex, chest_id: construction.id });
        }
        rpcPromise = supabase.rpc('move_item_to_chest', { p_inventory_id: fromItemInv.id, p_chest_id: construction.id, p_quantity_to_move: fromItemInv.quantity, p_target_slot: toIndex });
      } else if (source === 'chest' && target === 'inventory') {
        if (!fromItemChest) return;
        if (toItemInv) {
            if (fromItemChest.item_id === toItemInv.item_id && fromItemChest.items?.stackable) {
                toItemInv.quantity += fromItemChest.quantity;
                optimisticData.chestItems = optimisticData.chestItems.filter((i: ChestItemType) => i.id !== fromItemChest.id);
            } else {
                const fromChestIndex = optimisticData.chestItems.findIndex((i: ChestItemType) => i.id === fromItemChest.id);
                const toInvIndex = optimisticData.inventory.findIndex((i: InventoryItem) => i.id === toItemInv.id);
                const tempFrom = { ...optimisticData.chestItems[fromChestIndex] };
                const tempTo = { ...optimisticData.inventory[toInvIndex] };
                optimisticData.chestItems[fromChestIndex] = { ...tempTo, slot_position: fromIndex, chest_id: construction.id };
                optimisticData.inventory[toInvIndex] = { ...tempFrom, slot_position: toIndex };
            }
        } else {
            optimisticData.chestItems = optimisticData.chestItems.filter((i: ChestItemType) => i.id !== fromItemChest.id);
            optimisticData.inventory.push({ ...fromItemChest, slot_position: toIndex });
        }
        rpcPromise = supabase.rpc('move_item_from_chest', { p_chest_item_id: fromItemChest.id, p_quantity_to_move: fromItemChest.quantity, p_target_slot: toIndex });
      }
  
      setPlayerData(optimisticData);
  
      if (rpcPromise) {
        const { error } = await rpcPromise;
        if (error) throw error;
        await refreshInventoryAndChests();
      }
    } catch (error: any) {
      showError(error.message || "Erreur de transfert.");
      setPlayerData(originalPlayerData);
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
      <div className="flex flex-col min-h-0">
        <h3 className="text-center font-bold mb-2 flex-shrink-0">{title}</h3>
        <div className="bg-black/20 rounded-lg p-2 border border-slate-700 grid [grid-template-columns:repeat(auto-fill,minmax(4rem,1fr))] gap-2 content-start overflow-y-auto no-scrollbar flex-1">
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
        <DialogContent className="max-w-3xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
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
        onUpdate={refreshInventoryAndChests}
      />
    </>
  );
};

export default ChestModal;