import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ItemIcon from "./ItemIcon";
import { InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";

interface InventorySlotProps {
  item: InventoryItem | null;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isSelected?: boolean;
}

const InventorySlot = ({ item, onClick, onDragStart, onDrop, onDragOver, onDragEnd, onContextMenu, isSelected }: InventorySlotProps) => {
  const { getIconUrl } = useGame();
  const iconUrl = item ? getIconUrl(item.items?.icon || null) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onContextMenu={onContextMenu}
            className={cn(
              "w-20 h-20",
              "bg-slate-800/50 border-2 border-slate-700 rounded-lg",
              "flex items-center justify-center cursor-pointer transition-all duration-200",
              "hover:bg-slate-700/70 hover:border-yellow-500/50",
              isSelected ? "border-yellow-400 ring-2 ring-yellow-400/50" : "",
              item ? "draggable" : ""
            )}
            draggable={!!item}
          >
            {item && iconUrl ? (
              <div className="relative w-full h-full p-2">
                <ItemIcon iconName={iconUrl} alt={item.items?.name || 'Objet'} />
                {item.quantity > 1 && (
                  <span className="absolute bottom-1 right-1 text-xs font-bold text-white bg-slate-900/70 px-1.5 py-0.5 rounded">
                    {item.quantity}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        </TooltipTrigger>
        {item && (
          <TooltipContent side="top" className="bg-slate-900/80 backdrop-blur-sm text-white border-slate-700">
            <p className="font-bold">{item.items?.name}</p>
            <p className="text-sm text-gray-400">{item.items?.description}</p>
            <p className="text-xs text-gray-500 italic mt-1">{item.items?.type}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default InventorySlot;