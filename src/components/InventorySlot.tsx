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
  onDragStart: (index: number, node: HTMLDivElement) => void;
  isBeingDragged: boolean;
  isDragOver: boolean;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, isBeingDragged, isDragOver }: InventorySlotProps) => {
  const handleInteractionStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (item) {
      onDragStart(index, e.currentTarget);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="relative aspect-square flex items-center justify-center rounded-lg border bg-black/20 border-white/10 cursor-not-allowed">
        <Lock className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  return (
    <div
      data-slot-index={index}
      onMouseDown={handleInteractionStart}
      onTouchStart={handleInteractionStart}
      className={cn(
        "relative aspect-square rounded-lg border transition-all duration-200",
        // Style de base pour un slot vide
        "bg-white/5 border-white/10",
        // Style pour un slot plein
        item && "bg-sky-400/10 border-sky-400/20",
        // Style quand un objet est glissé par-dessus
        isDragOver && "bg-white/20 ring-2 ring-sky-400",
        // Style quand cet objet est celui qu'on déplace
        isBeingDragged && "opacity-30",
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