import { useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import ItemIcon from "./ItemIcon";

interface InventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isUnlocked: boolean;
  onDragStart: (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  onItemClick: (item: InventoryItem) => void;
  isBeingDragged?: boolean;
  isDragOver?: boolean;
  isLocked?: boolean;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, onItemClick, isBeingDragged, isDragOver, isLocked }: InventorySlotProps) => {
  const { getIconUrl } = useGame();
  const slotRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (item && !isLocked) {
      onDragStart(index, slotRef.current!, e);
    } else if (item) {
      onItemClick(item);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (item && !isLocked) {
      onDragStart(index, slotRef.current!, e);
    } else if (item) {
      onItemClick(item);
    }
  };

  return (
    <div
      ref={slotRef}
      className={cn(
        "relative w-14 h-14 bg-slate-900/50 rounded-lg flex items-center justify-center border",
        isUnlocked ? "border-slate-700" : "border-slate-800",
        !isUnlocked && "opacity-50",
        // Removed: isBeingDragged && "opacity-0", to keep the original item visible
        isDragOver && "border-blue-400 ring-2 ring-blue-400",
        isLocked && "cursor-not-allowed"
      )}
      data-slot-index={index}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {item ? (
        <>
          <div className="item-visual w-full h-full flex items-center justify-center">
            <ItemIcon iconName={getIconUrl(item.items?.icon) || item.items?.icon} alt={item.items?.name || ''} className="w-10 h-10" />
          </div>
          <span className="absolute bottom-0.5 right-1 text-xs font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
            x{item.quantity}
          </span>
        </>
      ) : (
        isUnlocked && <Plus className="w-6 h-6 text-gray-500" />
      )}
    </div>
  );
};

export default InventorySlot;