"use client";

import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ item, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.slot_position });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-square border border-gray-700 rounded-md flex items-center justify-center cursor-pointer bg-black/50"
      onClick={() => onClick(item)}
    >
      <Image src={`/icons/${item.items.icon}`} alt={item.items.name} width={48} height={48} />
      {item.quantity > 1 && (
        <div className="absolute bottom-0 right-1 text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
          x{item.quantity}
        </div>
      )}
    </div>
  );
};

export function Inventory() {
  const { inventory, playerState, fetchPlayerData } = useGame();
  const [selectedItem, setSelectedItem] = useState(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const fromSlot = active.id;
      const toSlot = over.id;
      
      const { error } = await supabase.rpc('swap_inventory_items', {
        p_from_slot: fromSlot,
        p_to_slot: toSlot
      });

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        fetchPlayerData();
      }
    }
  };

  const inventorySlots = Array.from({ length: playerState?.unlocked_slots || 0 }, (_, i) => {
    return inventory.find(item => item.slot_position === i) || { id: `empty-${i}`, slot_position: i, empty: true };
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="p-4 bg-gray-900/80 rounded-lg border border-gray-700">
        <h2 className="text-lg font-bold mb-4 text-white">Inventaire</h2>
        <SortableContext items={inventorySlots.map(i => i.slot_position)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-5 gap-2">
            {inventorySlots.map((item) => {
              if (item.empty) {
                return <div key={item.id} className="aspect-square border border-dashed border-gray-600 rounded-md bg-black/30" />;
              }
              return <SortableItem key={item.id} item={item} onClick={setSelectedItem} />;
            })}
          </div>
        </SortableContext>

        {selectedItem && (
          <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedItem.items.name}</DialogTitle>
                <DialogDescription>{selectedItem.items.description}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center">
                <Image src={`/icons/${selectedItem.items.icon}`} alt={selectedItem.items.name} width={96} height={96} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedItem(null)}>Fermer</Button>
                <Button>{selectedItem.items.use_action_text || 'Utiliser'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DndContext>
  );
}