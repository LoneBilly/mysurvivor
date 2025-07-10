import { useState } from 'react';
import { cn } from "@/lib/utils";
import ItemIcon from "./ItemIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

export interface InventoryItem {
  item_id: number;
  quantity: number;
  slot_position: number;
  items: {
    name: string;
    description: string | null;
    icon: string | null;
    signedIconUrl?: string;
  } | null;
}

interface DraggableInventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isLocked: boolean;
  onDrop: (fromIndex: number, toIndex: number) => void;
}

const DraggableInventorySlot = ({ item, index, isLocked, onDrop }: DraggableInventorySlotProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (isLocked || !item) return;
    setIsDragging(true);
    e.dataTransfer.setData("fromIndex", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isLocked) {
      setIsOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLocked) return;
    setIsOver(false);
    const fromIndex = parseInt(e.dataTransfer.getData("fromIndex"), 10);
    if (!isNaN(fromIndex)) {
      onDrop(fromIndex, index);
    }
  };

  if (isLocked) {
    return (
      <div className="relative aspect-square flex items-center justify-center rounded-lg border bg-black/20 border-white/10 cursor-not-allowed">
        <Lock className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  if (!item) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative aspect-square flex items-center justify-center rounded-lg border transition-all duration-200 bg-white/10 border-white/20",
          isOver && "bg-white/25 border-white/40"
        )}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative aspect-square flex items-center justify-center p-1 rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing",
              "bg-sky-400/20 border-sky-400/40",
              isDragging && "opacity-50",
              isOver && "bg-sky-400/30 border-sky-400/50"
            )}
          >
            <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || 'item'} />
            {item.quantity > 1 && (
              <span className="absolute bottom-0 right-1 text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                {item.quantity}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-900 text-white border-gray-700">
          <p className="font-bold">{item.items?.name}</p>
          {item.items?.description && <p className="text-sm text-gray-400">{item.items.description}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DraggableInventorySlot;