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
import { useRef } from "react";
import { useGame } from "@/contexts/GameContext";

interface InventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isUnlocked: boolean;
  onDragStart: (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  onItemClick: (item: InventoryItem) => void;
  isBeingDragged: boolean;
  isDragOver: boolean;
  isLocked?: boolean;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, onItemClick, isBeingDragged, isDragOver, isLocked = false }: InventorySlotProps) => {
  const { getIconUrl } = useGame();
  const interactionState = useRef<{
    startPos: { x: number, y: number };
    isDragging: boolean;
  } | null>(null);

  const handleInteractionStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (item && isUnlocked && !isBeingDragged && !isLocked) {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      interactionState.current = {
        startPos: { x: clientX, y: clientY },
        isDragging: false,
      };
    }
  };

  const handleInteractionMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (interactionState.current && !interactionState.current.isDragging) {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      const dx = Math.abs(clientX - interactionState.current.startPos.x);
      const dy = Math.abs(clientY - interactionState.current.startPos.y);

      if (dx > 5 || dy > 5) { // Threshold for movement
        interactionState.current.isDragging = true;
        onDragStart(index, e.currentTarget, e);
      }
    }
  };

  const handleInteractionEnd = () => {
    if (item && !isLocked && interactionState.current && !interactionState.current.isDragging) {
      onItemClick(item);
    }
    interactionState.current = null;
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
      onMouseDown={handleInteractionStart}
      onTouchStart={handleInteractionStart}
      onMouseMove={handleInteractionMove}
      onTouchMove={handleInteractionMove}
      onMouseUp={handleInteractionEnd}
      onTouchEnd={handleInteractionEnd}
      onMouseLeave={() => { interactionState.current = null; }}
      style={{ touchAction: 'none' }}
      className={cn(
        "relative w-full aspect-square rounded-lg border transition-all duration-200 flex items-center justify-center",
        "bg-slate-700/50 border-slate-600",
        isDragOver && "bg-slate-600/70 ring-2 ring-slate-400 border-slate-400",
        isBeingDragged && "bg-transparent border-dashed border-slate-500",
        item && !isLocked && "cursor-grab active:cursor-grabbing hover:bg-slate-700/80 hover:border-slate-500",
        isLocked && "cursor-not-allowed opacity-60"
      )}
    >
      {isLocked && <Lock className="absolute w-4 h-4 text-white z-20" />}
      {item && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("absolute inset-0 item-visual", isBeingDragged && "opacity-0")}>
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