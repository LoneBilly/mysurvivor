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
import QuantitySliderModal from "./QuantitySliderModal";

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
  const [detailedItem, setDetailedItem] = useState<InventoryItem | null>(null);
  const [quantityModalState, setQuantityModalState] = useState<{
    isOpen: boolean;
    item: InventoryItem | null;
    onConfirm: (quantity: number) => void;
    title: string;
    description?: string;
    confirmLabel: string;
  }>({ isOpen: false, item: null, onConfirm: () => {}, title: '', confirmLabel: 'Confirmer' });

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

  const handleItemClick = (item: InventoryItem) => {
    setDetailedItem(item);
  };

  const handleUseItem = () => {
    showError("Cette fonctionnalité n'est pas encore disponible.");
  };

  const handleDropChestItem = async (item: InventoryItem, quantity: number) => {
    const { error } = await supabase.rpc('drop_chest_item', {
      p_chest_item_id: item.id,
      p_quantity_to_drop: quantity,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`${quantity} objet(s) jeté(s) du coffre.`);
      setDetailedItem(null);
      fetchChestContents();
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

  const performMove = async (fromIndex: number, toIndex: number, source: 'inventory' | 'chest', target: 'inventory' | 'chest', quantity: number) => {
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const originalChestItems = JSON.parse(JSON.stringify(chestItems));
    let rpcPromise;

    // Optimistic UI Update
    if (source === 'inventory' && target === 'chest') {
      const itemToMove = playerData.inventory.find(i => i.slot_position === fromIndex);
      if (!itemToMove || !construction) return;
      
      const newPlayerData = JSON.parse(JSON.stringify(playerData));
      const invItemIdx = newPlayerData.inventory.findIndex((i: InventoryItem) => i.id === itemToMove.id);
      if (newPlayerData.inventory[invItemIdx].quantity > quantity) {
        newPlayerData.inventory[invItemIdx].quantity -= quantity;
      } else {
        newPlayerData.inventory.splice(invItemIdx, 1);
      }
      setPlayerData(newPlayerData);
      
      rpcPromise = supabase.rpc('move_item_to_chest', { p_inventory_id: itemToMove.id, p_chest_id: construction.id, p_quantity_to_move: quantity, p_target_slot: toIndex });
    } else if (source === 'chest' && target === 'inventory') {
      const itemToMove = chestItems.find(i => i.slot_position === fromIndex);
      if (!itemToMove) return;

      const newChestItems = chestItems.map(i => ({...i}));
      const chestItemIdx = newChestItems.findIndex(i => i.id === itemToMove.id);
      if (newChestItems[chestItemIdx].quantity > quantity) {
        newChestItems[chestItemIdx].quantity -= quantity;
      } else {
        newChestItems.splice(chestItemIdx, 1);
      }
      setChestItems(newChestItems);

      rpcPromise = supabase.rpc('move_item_from_chest', { p_chest_item_id: itemToMove.id, p_quantity_to_move: quantity, p_target_slot: toIndex });
    } else if (source === 'inventory' && target === 'inventory') {
      const newPlayerData = JSON.parse(JSON.stringify(playerData));
      const fromItem = newPlayerData.inventory.find((i: InventoryItem) => i.slot_position === fromIndex);
      const toItem = newPlayerData.inventory.find((i: InventoryItem) => i.slot_position === toIndex);
      if (fromItem) fromItem.slot_position = toIndex;
      if (toItem) toItem.slot_position = fromIndex;
      setPlayerData(newPlayerData);
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (source === 'chest' && target === 'chest') {
      const newChestItems = [...chestItems];
      const fromItem = newChestItems.find(i => i.slot_position === fromIndex);
      const toItem = newChestItems.find(i => i.slot_position === toIndex);
      if (fromItem) fromItem.slot_position = toIndex;
      if (toItem) toItem.slot_position = fromIndex;
      setChestItems(newChestItems);
      if (!construction) return;
      rpcPromise = supabase.rpc('swap_chest_items', { p_chest_id: construction.id, p_from_slot: fromIndex, p_to_slot: toIndex });
    }

    if (rpcPromise) {
      const { error } = await rpcPromise;
      if (error) {
        showError(error.message || "Erreur de transfert.");
        setPlayerData(originalPlayerData);
        setChestItems(originalChestItems);
      } else {
        await onUpdate();
        await fetchChestContents();
      }
    }
  };

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

    const itemToMove = source === 'inventory'
      ? playerData.inventory.find(i => i.slot_position === fromIndex)
      : chestItems.find(i => i.slot_position === fromIndex);

    if (!itemToMove) {
      setDraggedItem(null);
      setDragOver(null);
      return;
    }

    const moveAction = (quantity: number) => {
      performMove(fromIndex, toIndex, source, target, quantity);
    };

    if (itemToMove.items?.stackable && itemToMove.quantity > 1 && source !== target) {
      setQuantityModalState({
        isOpen: true,
        item: itemToMove,
        title: "Choisir la quantité à déplacer",
        confirmLabel: "Déplacer",
        onConfirm: moveAction,
      });
    } else {
      moveAction(itemToMove.quantity);
    }

    setDraggedItem(null);
    setDragOver(null);
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
                onItemClick={handleItemClick}
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
        <ItemDetailModal
          isOpen={!!detailedItem}
          onClose={() => setDetailedItem(null)}
          item={detailedItem}
          onUse={handleUseItem}
          onDropOne={() => {
            if (detailedItem) handleDropChestItem(detailedItem, 1);
          }}
          onDropAll={() => {
            if (detailedItem) {
              if (detailedItem.quantity > 1) {
                setQuantityModalState({
                  isOpen: true,
                  item: detailedItem,
                  title: "Jeter des objets du coffre",
                  confirmLabel: "Jeter",
                  onConfirm: (quantity) => handleDropChestItem(detailedItem, quantity)
                });
              } else {
                handleDropChestItem(detailedItem, 1);
              }
            }
          }}
        />
        <QuantitySliderModal
          isOpen={quantityModalState.isOpen}
          onClose={() => setQuantityModalState({ ...quantityModalState, isOpen: false })}
          item={quantityModalState.item}
          onConfirm={quantityModalState.onConfirm}
          title={quantityModalState.title}
          description={quantityModalState.description}
          confirmLabel={quantityModalState.confirmLabel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ChestModal;