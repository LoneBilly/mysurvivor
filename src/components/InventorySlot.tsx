import { useState } from "react";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import ItemIcon from "./ItemIcon";
import { InventoryItem } from "./InventoryModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isUnlocked: boolean;
  onDragStart: (index: number) => void;
  onDrop: (targetIndex: number) => void;
  isBeingDragged: boolean;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, onDrop, isBeingDragged }: InventorySlotProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!item) return;
    e.dataTransfer.effectAllowed = "move";
    onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isUnlocked) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUnlocked) {
      onDrop(index);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="relative aspect-square flex items-center justify-center rounded-lg border bg-black/50 border-neutral-800 cursor-not-allowed">
        <Lock className="w-5 h-5 text-neutral-600" />
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
          "relative aspect-square rounded-lg border transition-all duration-200 bg-white/5 border-neutral-700",
          isDragOver && "bg-white/10 ring-2 ring-sky-400"
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative aspect-square flex items-center justify-center p-1 rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing",
              "bg-sky-900/50 border-sky-700/60",
              isBeingDragged && "opacity-30",
              isDragOver && "bg-white/10 ring-2 ring-sky-400"
            )}
          >
            <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
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

export default InventorySlot;