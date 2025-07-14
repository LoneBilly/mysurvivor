import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InventoryItem } from "@/types/game";
import { cn } from "@/lib/utils";
import ItemIcon from "./ItemIcon";
import { useGame } from "@/contexts/GameContext";

interface InventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isUnlocked: boolean;
  onDragStart: (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  onItemClick: (item: InventoryItem) => void;
  isBeingDragged?: boolean;
  isDragOver?: boolean;
  isOutputSlot?: boolean;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, onItemClick, isBeingDragged, isDragOver, isOutputSlot }: InventorySlotProps) => {
  const { getIconUrl } = useGame();
  const iconUrl = getIconUrl(item?.items?.icon || null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (item && e.button === 0) {
      onDragStart(index, e.currentTarget as HTMLDivElement, e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (item) {
      onDragStart(index, e.currentTarget as HTMLDivElement, e);
    }
  };

  const handleClick = () => {
    if (item) {
      onItemClick(item);
    }
  };

  if (!isUnlocked) {
    return <div className="w-full aspect-square bg-black/30 rounded-lg border border-slate-700 flex items-center justify-center text-slate-500 text-2xl font-bold">?</div>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-700 transition-all duration-150",
              isDragOver && "border-yellow-400 scale-105 shadow-lg shadow-yellow-400/20",
              item && "cursor-pointer",
              isOutputSlot && "cursor-pointer hover:bg-green-500/20 border-green-500"
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={handleClick}
          >
            {item && (
              <div className={cn("absolute inset-0 item-visual", isBeingDragged && "opacity-0")}>
                <ItemIcon iconName={iconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
                {item.quantity > 0 && (
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                    x{item.quantity}
                  </span>
                )}
              </div>
            )}
            {isOutputSlot && item && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                <span className="text-white font-bold text-xs">Collecter</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        {item && (
          <TooltipContent className="bg-slate-800 text-white border-slate-700">
            <p className="font-bold">{item.items?.name}</p>
            <p className="text-xs text-gray-400">{item.items?.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default InventorySlot;