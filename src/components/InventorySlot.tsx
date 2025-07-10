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
  onDragStart: (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  isBeingDragged: boolean;
  isDragOver: boolean;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, isBeingDragged, isDragOver }: InventorySlotProps) => {
  const handleInteractionStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (item) {
      onDragStart(index, e.currentTarget, e);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="relative aspect-square flex items-center justify-center rounded-lg border bg-black/50 border-neutral-800 cursor-not-allowed">
        <Lock className="w-5 h-5 text-neutral-600" />
      </div>
    );
  }

  return (
    <div
      data-slot-index={index}
      onMouseDown={handleInteractionStart}
      onTouchStart={handleInteractionStart}
      style={{ touchAction: 'none' }}
      className={cn(
        "relative aspect-square rounded-lg border transition-all duration-200",
        "bg-white/5 border-white/10 shadow-inner shadow-black/20",
        item && "bg-sky-400/5 border-sky-400/20",
        isDragOver && "bg-white/20 ring-2 ring-white scale-105",
        isBeingDragged && "opacity-20 scale-95",
        item && "cursor-grab active:cursor-grabbing"
      )}
    >
      {item && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full h-full">
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
      )}
    </div>
  );
};

export default InventorySlot;