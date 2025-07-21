"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/src/integrations/supabase/client";
import { PlayerState, InventoryItem, Equipment } from '@/src/lib/types'; // Assuming these types exist or will be created
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/src/lib/utils";
import { Backpack, Shirt, Footprints, Car } from 'lucide-react'; // Icons for equipment slots

interface AdminInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerState | null;
}

// Define the expected structure for inventory and equipment items
interface InventoryDisplayItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number | null;
  items: {
    name: string;
    description: string;
    icon: string;
    type: string;
    stackable: boolean;
    use_action_text: string | null;
    effects: any;
  };
}

interface EquipmentDisplay {
  armor: InventoryDisplayItem | null;
  backpack: InventoryDisplayItem | null;
  shoes: InventoryDisplayItem | null;
  vehicle: InventoryDisplayItem | null;
}

const AdminInventoryModal: React.FC<AdminInventoryModalProps> = ({ isOpen, onClose, player }) => {
  const [inventory, setInventory] = useState<InventoryDisplayItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const INVENTORY_SLOTS = 20; // Assuming a fixed number of inventory slots for display

  useEffect(() => {
    const fetchPlayerInventory = async () => {
      if (!player?.id || !isOpen) {
        setInventory([]);
        setEquipment(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_full_player_data', { p_user_id: player.id });

        if (rpcError) {
          throw rpcError;
        }

        if (data) {
          setInventory(data.inventory || []);
          setEquipment(data.equipment || null);
        } else {
          setInventory([]);
          setEquipment(null);
        }
      } catch (err: any) {
        console.error("Error fetching player inventory:", err);
        setError(err.message || "Failed to load inventory data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerInventory();
  }, [player?.id, isOpen]);

  const renderInventorySlot = (slotIndex: number) => {
    const itemInSlot = inventory.find(item => item.slot_position === slotIndex);

    return (
      <div
        key={slotIndex}
        className={cn(
          "relative w-16 h-16 border border-slate-600 rounded-md flex items-center justify-center",
          itemInSlot ? "bg-slate-700/50" : "bg-slate-900/30"
        )}
      >
        {itemInSlot ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center justify-center p-1 cursor-pointer">
                  {itemInSlot.items.icon && (
                    <img src={`/icons/${itemInSlot.items.icon}`} alt={itemInSlot.items.name} className="w-10 h-10 object-contain" />
                  )}
                  <span className="text-xs text-white mt-1">{itemInSlot.quantity}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-700 text-white border border-slate-600 p-2 rounded-md shadow-lg">
                <p className="font-bold">{itemInSlot.items.name}</p>
                <p className="text-sm text-slate-300">{itemInSlot.items.description}</p>
                {itemInSlot.items.type && <p className="text-xs text-slate-400">Type: {itemInSlot.items.type}</p>}
                {itemInSlot.items.use_action_text && <p className="text-xs text-slate-400">Action: {itemInSlot.items.use_action_text}</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-slate-500 text-xs">{slotIndex}</span>
        )}
      </div>
    );
  };

  const renderEquipmentSlot = (item: InventoryDisplayItem | null, icon: React.ReactNode, label: string) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative w-20 h-20 border border-slate-600 rounded-md flex flex-col items-center justify-center bg-slate-900/30 p-1">
              {item ? (
                <>
                  {item.items.icon && (
                    <img src={`/icons/${item.items.icon}`} alt={item.items.name} className="w-12 h-12 object-contain" />
                  )}
                  <span className="text-xs text-white mt-1">{item.quantity}</span>
                </>
              ) : (
                <>
                  {icon}
                  <span className="text-xs text-slate-400 mt-1">{label}</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          {item && (
            <TooltipContent className="bg-slate-700 text-white border border-slate-600 p-2 rounded-md shadow-lg">
              <p className="font-bold">{item.items.name}</p>
              <p className="text-sm text-slate-300">{item.items.description}</p>
              {item.items.type && <p className="text-xs text-slate-400">Type: {item.items.type}</p>}
              {item.items.use_action_text && <p className="text-xs text-slate-400">Action: {item.items.use_action_text}</p>}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6 flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl text-center">
            Inventaire de {player?.username || 'Joueur Anonyme'}
          </DialogTitle>
        </DialogHeader>

        {loading && <p className="text-center text-slate-400">Chargement de l'inventaire...</p>}
        {error && <p className="text-center text-red-400">Erreur: {error}</p>}

        {!loading && !error && (
          <ScrollArea className="flex-grow pr-4">
            <div className="flex flex-col gap-6">
              {/* Equipment Section */}
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold mb-3 text-white">Équipement</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
                  {renderEquipmentSlot(equipment?.armor, <Shirt className="w-10 h-10 text-slate-500" />, "Armure")}
                  {renderEquipmentSlot(equipment?.backpack, <Backpack className="w-10 h-10 text-slate-500" />, "Sac à dos")}
                  {renderEquipmentSlot(equipment?.shoes, <Footprints className="w-10 h-10 text-slate-500" />, "Chaussures")}
                  {renderEquipmentSlot(equipment?.vehicle, <Car className="w-10 h-10 text-slate-500" />, "Véhicule")}
                </div>
              </div>

              {/* Inventory Section */}
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold mb-3 text-white">Inventaire</h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2 justify-items-center">
                  {Array.from({ length: INVENTORY_SLOTS }).map((_, index) => renderInventorySlot(index))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminInventoryModal;