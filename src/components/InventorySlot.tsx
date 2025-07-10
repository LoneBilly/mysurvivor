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
      <div 
        className="relative aspect-square flex items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 cursor-not-allowed"
        style={{
          backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.2) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2) 75%, transparent 75%, transparent)",
          backgroundSize: "10px 10px"
        }}
      >
        <Lock className="w-5 h-5 text-neutral-700" />
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
        "relative aspect-square rounded-md border transition-all duration-200",
        "bg-neutral-800/50 border-neutral-700 shadow-inner shadow-black/60",
        "hover:bg-neutral-700/60",
        isDragOver && "bg-amber-400/20 ring-2 ring-amber-400 scale-105 border-amber-400/50",
        isBeingDragged && "opacity-20 scale-95 bg-black/70",
        item && "cursor-grab active:cursor-grabbing"
      )}
    >
      {item && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full h-full p-1">
                <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
                {item.quantity > 1 && (
                  <span className="absolute bottom-0.5 right-1.5 text-xs font-bold text-white" style={{ textShadow: '1px 1px 3px black' }}>
                    {item.quantity}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white border-neutral-700 font-mono">
              <p className="font-bold text-amber-300">{item.items?.name}</p>
              {item.items?.description && <p className="text-sm text-neutral-400">{item.items.description}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default InventorySlot;