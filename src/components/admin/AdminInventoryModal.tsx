import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from './PlayerManager';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, Package, Trash2, Edit, PlusCircle } from 'lucide-react';
import { Item } from '@/types/admin';
import ActionModal from '../ActionModal';
import { getPublicIconUrl } from '@/utils/imageUrls';
import InventorySlot from '../InventorySlot';
import EquipmentSlot, { EquipmentSlotType } from '../EquipmentSlot';
import ItemDetailModal from '../ItemDetailModal';
import { useGame } from '@/contexts/GameContext';
import { InventoryItem as GameInventoryItem } from '@/types/game';

interface InventoryItem extends GameInventoryItem {
  items: {
    name: string;
    icon: string | null;
    stackable: boolean;
    type?: string;
    description?: string;
    use_action_text?: string;
    effects?: Record<string, any>;
  };
}

interface EquippedItems {
  armor: InventoryItem | null;
  backpack: InventoryItem | null;
  shoes: InventoryItem | null;
  vehicle: InventoryItem | null;
}

interface AdminInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
}

const TOTAL_SLOTS = 50;

const SLOT_TYPE_MAP: Record<EquipmentSlotType, string> = {
  armor: 'Armure',
  backpack: 'Sac à dos',
  shoes: 'Chaussures',
  vehicle: 'Vehicule',
};

const AdminInventoryModal = ({ isOpen, onClose, player }: AdminInventoryModalProps) => {
  const { getIconUrl } = useGame();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedItems, setEquippedItems] = useState<EquippedItems>({ armor: null, backpack: null, shoes: null, vehicle: null });
  const [unlockedSlots, setUnlockedSlots] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [newItemId, setNewItemId] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'chest' } | null>(null);

  // Drag and drop states
  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'equipment' } | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; target: 'inventory' } | { type: EquipmentSlotType; target: 'equipment' } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!player) return;
    setLoading(true);
    try {
      const { data: playerStateData, error: playerStateError } = await supabase
        .from('player_states')
        .select('unlocked_slots')
        .eq('id', player.id)
        .single();

      if (playerStateError) throw playerStateError;
      setUnlockedSlots(playerStateData.unlocked_slots);

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventories')
        .select('id, quantity, slot_position, items(id, name, icon, stackable, type, description, use_action_text, effects)')
        .eq('player_id', player.id);

      if (inventoryError) throw inventoryError;

      const { data: equipmentData, error: equipmentError } = await supabase
        .from('player_equipment')
        .select('armor_inventory_id, backpack_inventory_id, shoes_inventory_id, vehicle_inventory_id')
        .eq('player_id', player.id)
        .single();

      if (equipmentError && equipmentError.code !== 'PGRST116') throw equipmentError; // PGRST116 means no row found

      const allItemsFetched = (inventoryData || []) as InventoryItem[];
      const newEquippedItems: EquippedItems = { armor: null, backpack: null, shoes: null, vehicle: null };

      if (equipmentData) {
        for (const key of Object.keys(newEquippedItems) as Array<keyof EquippedItems>) {
          const invId = equipmentData[`${key}_inventory_id`];
          if (invId) {
            const equippedItem = allItemsFetched.find(item => item.id === invId);
            if (equippedItem) {
              newEquippedItems[key] = equippedItem;
            }
          }
        }
      }
      setInventory(allItemsFetched);
      setEquippedItems(newEquippedItems);

    } catch (error: any) {
      showError("Erreur lors du chargement de l'inventaire.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [player]);

  const fetchAllItems = useCallback(async () => {
    const { data, error } = await supabase.from('items').select('*').order('name');
    if (error) {
      showError("Erreur lors du chargement de la liste d'objets.");
    } else {
      setAllItems(data);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchAllItems();
    }
  }, [isOpen, fetchInventory, fetchAllItems]);

  const handleSaveQuantity = async () => {
    if (!editingItem) return;
    const quantity = parseInt(editQuantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      showError("Quantité invalide.");
      return;
    }

    const { error } = await supabase
      .from('inventories')
      .update({ quantity })
      .eq('id', editingItem.id);

    if (error) {
      showError("Erreur lors de la mise à jour.");
    } else {
      showSuccess("Quantité mise à jour.");
      setEditingItem(null);
      fetchInventory();
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from('inventories').delete().eq('id', itemToDelete.id);
    if (error) {
      showError("Erreur lors de la suppression.");
    } else {
      showSuccess("Objet supprimé de l'inventaire.");
      setItemToDelete(null);
      fetchInventory();
    }
  };

  const handleAddItem = async () => {
    if (!newItemId || !newItemQuantity) {
      showError("Veuillez sélectionner un objet et une quantité.");
      return;
    }
    const quantity = parseInt(newItemQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      showError("Quantité invalide.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('admin_add_item_to_inventory', {
      p_player_id: player.id,
      p_item_id: parseInt(newItemId, 10),
      p_quantity: quantity,
    });
    setLoading(false);

    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess("Objet ajouté avec succès.");
      setIsAddingItem(false);
      setNewItemId('');
      setNewItemQuantity('1');
      fetchInventory();
    }
  };

  const handleItemClick = (item: InventoryItem, source: 'inventory' | 'chest') => {
    setDetailedItem({ item, source });
  };

  const handleUseItem = () => {
    showError("Cette fonctionnalité n'est pas disponible en mode admin.");
  };

  const handleDropOneItem = async () => {
    if (!detailedItem) return;
    setDetailedItem(null);
    const { error } = await supabase.rpc('drop_inventory_item', { p_inventory_id: detailedItem.item.id, p_quantity_to_drop: 1 });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet jeté.");
      fetchInventory();
    }
  };

  const handleDropAllItems = async () => {
    if (!detailedItem) return;
    setDetailedItem(null);
    const { error } = await supabase.rpc('drop_inventory_item', { p_inventory_id: detailedItem.item.id, p_quantity_to_drop: detailedItem.item.quantity });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objets jetés.");
      fetchInventory();
    }
  };

  const handleSplitItem = async (item: InventoryItem, quantity: number) => {
    if (!item) return;
    setDetailedItem(null);
    const { error } = await supabase.rpc('split_inventory_item', {
      p_inventory_id: item.id,
      p_split_quantity: quantity,
    });
    if (error) {
      showError(error.message || "Erreur lors de la division de l'objet.");
    } else {
      showSuccess("La pile d'objets a été divisée.");
      fetchInventory();
    }
  };

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index') || el.hasAttribute('data-slot-type'));
    
    if (slotElement) {
      if (slotElement.hasAttribute('data-slot-index')) {
        const index = parseInt(slotElement.getAttribute('data-slot-index') || '-1', 10);
        if (index !== -1 && index < unlockedSlots) {
          setDragOver({ index, target: 'inventory' });
          return;
        }
      } else if (slotElement.hasAttribute('data-slot-type')) {
        const type = slotElement.getAttribute('data-slot-type') as EquipmentSlotType;
        setDragOver({ type, target: 'equipment' });
        return;
      }
    }
    setDragOver(null);

    const gridEl = gridRef.current;
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const scrollThreshold = 60;

    stopAutoScroll();

    if (clientY < rect.top + scrollThreshold) {
      const scroll = () => {
        gridEl.scrollTop -= 10;
        scrollIntervalRef.current = requestAnimationFrame(scroll);
      };
      scroll();
    } else if (clientY > rect.bottom - scrollThreshold) {
      const scroll = () => {
        gridEl.scrollTop += 10;
        scrollIntervalRef.current = requestAnimationFrame(scroll);
      };
      scroll();
    }
  }, [unlockedSlots, stopAutoScroll]);

  const handleDragStart = useCallback((item: InventoryItem, source: 'inventory' | 'equipment', node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItem({ item, source });
    
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
  }, [handleDragMove]);

  const handleDragEnd = useCallback(async () => {
    stopAutoScroll();
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }

    const dragged = draggedItem;
    const over = dragOver;

    setDraggedItem(null);
    setDragOver(null);

    if (!dragged || !over || !player) return;

    if (dragged.source === 'inventory' && over.target === 'inventory' && dragged.item.slot_position === over.index) return;
    if (dragged.source === 'equipment' && over.target === 'equipment' && (equippedItems as any)[over.type]?.id === dragged.item.id) return;

    try {
      if (dragged.source === 'inventory' && over.target === 'inventory') {
        const { error } = await supabase.rpc('swap_inventory_items', { p_from_slot: dragged.item.slot_position, p_to_slot: over.index });
        if (error) throw error;
      } else if (dragged.source === 'equipment' && over.target === 'inventory') {
        const extraSlots = dragged.item.items?.effects?.extra_slots || 0;
        if (extraSlots > 0) {
            const currentUnlockedSlots = unlockedSlots;
            const newUnlockedSlots = currentUnlockedSlots - extraSlots;

            if (over.index >= newUnlockedSlots) {
                showError("Vous ne pouvez pas placer cet objet dans un emplacement qui sera verrouillé.");
                return;
            }

            const highestOccupiedSlot = Math.max(-1, ...inventory
                .filter(i => i.slot_position !== null && i.id !== dragged.item.id)
                .map(i => i.slot_position as number)
            );
            
            if (highestOccupiedSlot >= newUnlockedSlots) {
                showError("Impossible de déséquiper : des objets se trouvent dans des emplacements qui seraient verrouillés.");
                return;
            }
        }
        const { error } = await supabase.rpc('unequip_item_to_slot', { p_inventory_id: dragged.item.id, p_target_slot: over.index });
        if (error) throw error;
      } else if (dragged.source === 'inventory' && over.target === 'equipment') {
        const requiredItemType = SLOT_TYPE_MAP[over.type];
        const draggedItemType = dragged.item.items?.type;
        if (requiredItemType !== draggedItemType) {
          showError(`Cet objet ne peut pas être équipé ici. Emplacement pour: ${requiredItemType}.`);
          return;
        }
        const { error } = await supabase.rpc('equip_item', { p_inventory_id: dragged.item.id, p_slot_type: over.type });
        if (error) throw error;
      }
      fetchInventory(); // Re-fetch to ensure state is consistent with DB
    } catch (error: any) {
      showError(error.message || "Erreur de mise à jour de l'inventaire.");
      fetchInventory(); // Re-fetch to revert optimistic updates on error
    }
  }, [draggedItem, dragOver, player, unlockedSlots, equippedItems, inventory, stopAutoScroll, fetchInventory]);

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
      stopAutoScroll();
    };
  }, [draggedItem, handleDragMove, handleDragEnd, stopAutoScroll]);

  useEffect(() => {
    if (!isOpen) {
      if (draggedItemNode.current) {
        document.body.removeChild(draggedItemNode.current);
        draggedItemNode.current = null;
      }
      setDraggedItem(null);
      setDragOver(null);
      stopAutoScroll();
    }
  }, [isOpen, stopAutoScroll]);

  const inventorySlots = Array.from({ length: TOTAL_SLOTS }).map((_, index) => {
    return inventory.find(item => item.slot_position === index) || null;
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl text-center">
              Inventaire de {player.username || 'Joueur Anonyme'}
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-400 font-mono mt-1 text-center">
              <span className="text-white font-bold">{unlockedSlots}</span> / {TOTAL_SLOTS} SLOTS DÉBLOQUÉS
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center gap-1 sm:gap-2 mb-6 relative">
            {Object.entries(equippedItems).map(([type, item]) => (
              <div key={type} className="flex flex-col items-center gap-2">
                <EquipmentSlot
                  slotType={type as EquipmentSlotType}
                  label={SLOT_TYPE_MAP[type as EquipmentSlotType]}
                  item={item}
                  onDragStart={(item, node, e) => handleDragStart(item, 'equipment', node, e)}
                  isDragOver={dragOver?.target === 'equipment' && dragOver.type === (type as EquipmentSlotType)}
                  onItemClick={(clickedItem) => handleItemClick(clickedItem, 'inventory')} // Source is inventory as equipped items are from inventory
                />
                <p className="text-xs text-gray-400 font-mono">{SLOT_TYPE_MAP[type as EquipmentSlotType]}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 flex-grow overflow-y-auto relative"
            >
              {inventorySlots.map((item, index) => (
                <InventorySlot
                  key={item?.id || `slot-${index}`}
                  item={item}
                  index={index}
                  isUnlocked={index < unlockedSlots}
                  onDragStart={(idx, node, e) => inventorySlots[idx] && handleDragStart(inventorySlots[idx]!, 'inventory', node, e)}
                  onItemClick={(clickedItem) => clickedItem && handleItemClick(clickedItem, 'inventory')}
                  isBeingDragged={draggedItem?.source === 'inventory' && draggedItem.item.slot_position === index}
                  isDragOver={dragOver?.target === 'inventory' && dragOver.index === index}
                  onRemove={(itemToRemove) => setItemToDelete(itemToRemove)}
                />
              ))}
            </div>
          )}
          <DialogFooter className="mt-4 pt-4 border-t border-slate-700">
            <Button onClick={() => setIsAddingItem(true)} className="w-full sm:w-auto">
              <PlusCircle className="w-4 h-4 mr-2" />
              Ajouter un objet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle>Modifier la quantité de {editingItem.items.name}</DialogTitle>
              <DialogDescription className="sr-only">Modifier la quantité de l'objet {editingItem.items.name}.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="mt-1 bg-white/5 border-white/20"
              />
            </div>
            <DialogFooter>
              <div className="flex w-full justify-end">
                <Button onClick={handleSaveQuantity}>Sauvegarder</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ActionModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer ${itemToDelete?.items.name} de l'inventaire de ce joueur ?`}
        actions={[
          { label: "Confirmer", onClick: handleDeleteItem, variant: "destructive" },
          { label: "Annuler", onClick: () => setItemToDelete(null), variant: "secondary" },
        ]}
      />

      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>Ajouter un objet à l'inventaire</DialogTitle>
            <DialogDescription className="sr-only">Ajouter un nouvel objet à l'inventaire du joueur.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Objet</Label>
              <select
                value={newItemId}
                onChange={(e) => setNewItemId(e.target.value)}
                className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg text-white focus:ring-white/30 focus:border-white/30"
              >
                <option value="" disabled>Sélectionner un objet...</option>
                {allItems.map(item => (
                  <option key={item.id} value={String(item.id)}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="new-quantity">Quantité</Label>
              <Input
                id="new-quantity"
                type="number"
                inputMode="numeric"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                className="mt-1 bg-white/5 border-white/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddItem}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ItemDetailModal
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        item={detailedItem?.item || null}
        source={detailedItem?.source}
        onUse={handleUseItem}
        onDropOne={handleDropOneItem}
        onDropAll={handleDropAllItems}
        onSplit={handleSplitItem}
        onUpdate={fetchInventory}
      />
    </>
  );
};

export default AdminInventoryModal;