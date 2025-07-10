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
    if (item && isUnlocked) {
      onDragStart(index, e.currentTarget, e);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-lg bg-black/20 border border-dashed border-white/10 cursor-not-allowed">
        <Lock className="w-5 h-5 text-gray-600" />
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
        "relative w-16 h-16 flex-shrink-0 rounded-lg border transition-all duration-200",
        "bg-white/10 border-white/20",
        isDragOver && "bg-white/25 ring-2 ring-white/60 border-white/40",
        isBeingDragged && "bg-transparent border-dashed border-white/30",
        item && "cursor-grab active:cursor-grabbing hover:bg-white/20 hover:border-white/30"
      )}
    >
      {item && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("w-full h-full item-visual", isBeingDragged && "opacity-0")}>
                <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
                {item.quantity > 1 && (
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                    {item.quantity}
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