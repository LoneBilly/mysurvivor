import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Box, MoveLeft, MoveRight } from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";

// Types (assumed from schema)
interface Item {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: {
    name: string;
    description: string;
    icon: string;
    stackable: boolean;
  };
}

interface Chest {
  id: number;
  type: string;
}

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  chest: Chest;
  inventoryItems: Item[];
  chestItems: Item[];
  onRefresh: () => void;
  unlockedSlots: number;
  chestSlots: number;
}

const ItemSlot = ({ item, onClick, isSelected }: { item: Item | null, onClick: () => void, isSelected: boolean }) => (
  <TooltipProvider>
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          onClick={onClick}
          className={`aspect-square border-2 rounded-md flex items-center justify-center cursor-pointer transition-all
            ${isSelected ? 'border-yellow-400 scale-105 shadow-lg shadow-yellow-400/20' : 'border-slate-600 hover:border-slate-400'}
            ${item ? 'bg-slate-700/50' : 'bg-slate-900/50'}`}
        >
          {item && (
            <div className="relative flex flex-col items-center justify-center">
              <img src={`/assets/icons/${item.items.icon}`} alt={item.items.name} className="w-10 h-10 object-contain" />
              {item.items.stackable && item.quantity > 1 && (
                <span className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-xs font-bold rounded-full px-1.5 py-0.5 border border-slate-600">
                  {item.quantity}
                </span>
              )}
            </div>
          )}
        </div>
      </TooltipTrigger>
      {item && (
        <TooltipContent className="bg-slate-800 text-white border-slate-700">
          <p className="font-bold">{item.items.name}</p>
          <p className="text-sm text-slate-300">{item.items.description}</p>
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
);

export function ChestModal({ isOpen, onClose, chest, inventoryItems, chestItems, onRefresh, unlockedSlots, chestSlots }: ChestModalProps) {
  const [selectedItem, setSelectedItem] = useState<{ type: 'inventory' | 'chest', item: Item } | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleSelect = (type: 'inventory' | 'chest', item: Item) => {
    if (selectedItem && selectedItem.item.id === item.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem({ type, item });
      setQuantity(item.quantity);
    }
  };

  const findNextAvailableSlot = (items: Item[], maxSlots: number) => {
    const usedSlots = items.map(i => i.slot_position);
    for (let i = 0; i < maxSlots; i++) {
      if (!usedSlots.includes(i)) {
        return i;
      }
    }
    return -1;
  };

  const handleMove = async () => {
    if (!selectedItem) return;

    const toastId = toast.loading('Déplacement en cours...');
    let error;

    if (selectedItem.type === 'inventory') {
      const targetSlot = findNextAvailableSlot(chestItems, chestSlots);
      if (targetSlot === -1) {
        toast.error("Le coffre est plein !", { id: toastId });
        return;
      }
      const { error: rpcError } = await supabase.rpc('move_item_to_chest', {
        p_inventory_id: selectedItem.item.id,
        p_chest_id: chest.id,
        p_quantity_to_move: quantity,
        p_target_slot: targetSlot,
      });
      error = rpcError;
    } else {
      const targetSlot = findNextAvailableSlot(inventoryItems, unlockedSlots);
      if (targetSlot === -1) {
        toast.error("Votre inventaire est plein !", { id: toastId });
        return;
      }
      const { error: rpcError } = await supabase.rpc('move_item_from_chest', {
        p_chest_item_id: selectedItem.item.id,
        p_quantity_to_move: quantity,
        p_target_slot: targetSlot,
      });
      error = rpcError;
    }

    if (error) {
      toast.error(`Erreur: ${error.message}`, { id: toastId });
    } else {
      toast.success('Objet déplacé !', { id: toastId });
      onRefresh();
      setSelectedItem(null);
    }
  };

  const inventoryGrid = useMemo(() => Array.from({ length: unlockedSlots }, (_, i) => inventoryItems.find(item => item.slot_position === i) || null), [inventoryItems, unlockedSlots]);
  const chestGrid = useMemo(() => Array.from({ length: chestSlots }, (_, i) => chestItems.find(item => item.slot_position === i) || null), [chestItems, chestSlots]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[90vh] max-h-[800px] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Box className="w-7 h-7 text-white" />
            <DialogTitle className="text-2xl">Contenu du Coffre</DialogTitle>
          </div>
          <DialogDescription>Déplacez les objets entre votre inventaire et le coffre.</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col lg:flex-row flex-1 gap-4 mt-4 overflow-hidden">
          <Card className="w-full lg:w-5/12 bg-transparent border-slate-700 flex flex-col">
            <CardHeader>
              <CardTitle>Votre Inventaire</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 pr-4">
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {inventoryGrid.map((item, index) => (
                  <ItemSlot
                    key={`inv-${index}`}
                    item={item}
                    onClick={() => item && handleSelect('inventory', item)}
                    isSelected={selectedItem?.type === 'inventory' && selectedItem?.item.id === item?.id}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex lg:flex-col items-center justify-center gap-4 p-4">
            <div className="flex flex-col items-center gap-2">
                <Button onClick={handleMove} disabled={!selectedItem || selectedItem.type !== 'inventory'} className="w-12 h-12 p-2">
                    <MoveRight size={24} />
                </Button>
                <Button onClick={handleMove} disabled={!selectedItem || selectedItem.type !== 'chest'} className="w-12 h-12 p-2">
                    <MoveLeft size={24} />
                </Button>
            </div>
            {selectedItem && selectedItem.item.items.stackable && (
                <div className="flex flex-col items-center gap-1">
                    <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(selectedItem.item.quantity, parseInt(e.target.value, 10) || 1)))}
                        className="w-20 text-center bg-slate-900 border-slate-700"
                        max={selectedItem.item.quantity}
                        min={1}
                    />
                    <Button variant="link" size="sm" onClick={() => setQuantity(selectedItem.item.quantity)}>Max</Button>
                </div>
            )}
          </div>

          <Card className="w-full lg:w-5/12 bg-transparent border-slate-700 flex flex-col">
            <CardHeader>
              <CardTitle>Coffre</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 pr-4">
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {chestGrid.map((item, index) => (
                  <ItemSlot
                    key={`chest-${index}`}
                    item={item}
                    onClick={() => item && handleSelect('chest', item)}
                    isSelected={selectedItem?.type === 'chest' && selectedItem?.item.id === item?.id}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}