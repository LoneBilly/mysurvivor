"use client";

import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';

interface DraggableItem {
  id: number;
  item_id: number;
  name: string;
  icon: string;
  quantity: number;
  slot_position: number;
  context: string;
}

interface InventorySlotProps {
  item: DraggableItem | null;
  slot: number;
  context: string;
  onDropItem: (draggedItem: DraggableItem, targetSlot: number) => void;
  onClick?: (item: DraggableItem | null) => void;
}

const ItemDisplay: React.FC<{ item: DraggableItem }> = ({ item }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'item',
    item: item,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={cn(
        "relative w-full h-full flex items-center justify-center rounded-md cursor-grab",
        "bg-slate-800/50 hover:bg-slate-700/50",
        isDragging && "opacity-40"
      )}
    >
      <Image
        src={`/assets/items/${item.icon}`}
        alt={item.name}
        width={48}
        height={48}
        className="object-contain pointer-events-none"
      />
      {item.quantity > 1 && (
        <Badge
          variant="secondary"
          className="absolute bottom-0.5 right-0.5 text-xs px-1 py-0"
        >
          {item.quantity}
        </Badge>
      )}
    </div>
  );
};

const InventorySlot: React.FC<InventorySlotProps> = ({ item, slot, context, onDropItem, onClick }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'item',
    drop: (draggedItem: DraggableItem) => onDropItem(draggedItem, slot),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [onDropItem, slot]);

  return (
    <div
      ref={drop}
      onClick={() => onClick && onClick(item)}
      className={cn(
        "w-16 h-16 md:w-20 md:h-20 rounded-lg border-2",
        "flex items-center justify-center transition-colors",
        isOver && canDrop ? "border-yellow-400 bg-yellow-500/20" : "border-slate-700 bg-slate-900/50",
        item ? "p-1 cursor-pointer" : "cursor-default"
      )}
    >
      {item ? (
        <ItemDisplay item={item} />
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
  );
};

export default InventorySlot;