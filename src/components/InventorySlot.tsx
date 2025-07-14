import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import ItemIcon from "./ItemIcon";
import { InventoryItem } from "@/types/game";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGame } from "@/contexts/GameContext";

interface InventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isUnlocked: boolean;
  onDragStart: (item: InventoryItem, index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  onItemClick: (item: InventoryItem) => void;
  isBeingDragged: boolean;
  isDragOver: boolean;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, onItemClick, isBeingDragged, isDragOver }: InventorySlotProps) => {
  const { getIconUrl } = useGame();

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (item && isUnlocked && !isBeingDragged) {
      onDragStart(item, index, e.currentTarget, e);
    } else if (item && isUnlocked) {
      onItemClick(item); // Allow click even if already dragging (e.g., to open detail modal)
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (item && isUnlocked && !isBeingDragged) {
      onDragStart(item, index, e.currentTarget, e);
    } else if (item && isUnlocked) {
      onItemClick(item);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="relative w-full aspect-square flex items-center justify-center rounded-lg bg-black/20 border border-dashed border-slate-600 cursor-not-allowed">
        <Lock className="w-5 h-5 text-slate-500" />
      </div>
    );
  }

  const iconUrl = item ? getIconUrl(item.items?.icon) : null;

  return (
    <div
      data-slot-index={index}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={cn(
        "relative w-full aspect-square rounded-lg border transition-all duration-200 flex items-center justify-center",
        "bg-slate-700/50 border-slate-600",
        isDragOver && "bg-slate-600/70 ring-2 ring-slate-400 border-slate-400",
        isBeingDragged && "opacity-0", // Hide the original item when dragging
        item && "cursor-grab active:cursor-grabbing hover:bg-slate-700/80 hover:border-slate-500"
      )}
    >
      {item && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute inset-0 item-visual">
                <ItemIcon iconName={iconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
                {item.quantity > 0 && (
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                    x{item.quantity}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20 font-mono rounded-lg shadow-lg p-3">
              <p className="font-bold text-lg text-white">{item.items?.name}</p>
              {item.items?.description && <p className="text-sm text-gray-300 max-w-xs mt-1">{item.items.description}</p>}
              <p className="text-xs text-gray-500 mt-2 uppercase tracking-wider">{item.items?.type || 'Objet'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default InventorySlot;