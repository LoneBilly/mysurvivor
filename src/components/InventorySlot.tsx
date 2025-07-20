import { InventoryItem } from "@/types/game";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";

interface InventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isUnlocked: boolean;
  onDragStart: (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  onItemClick: () => void;
  isBeingDragged: boolean;
  isDragOver: boolean;
  placeholderIcon?: React.ReactNode;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, onItemClick, isBeingDragged, isDragOver, placeholderIcon }: InventorySlotProps) => {
  const slotRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (item && slotRef.current) {
      onDragStart(index, slotRef.current, e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (item && slotRef.current) {
      onDragStart(index, slotRef.current, e);
    }
  };

  return (
    <div
      ref={slotRef}
      data-slot-index={index >= 0 ? index : undefined}
      className={cn(
        "w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 flex items-center justify-center transition-all duration-150 relative",
        isUnlocked ? "border-slate-600 bg-slate-700/50" : "border-slate-800 bg-slate-900/80",
        isDragOver && "border-yellow-400 bg-yellow-400/20 scale-105",
        isBeingDragged && "opacity-30"
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={() => !isBeingDragged && item && onItemClick()}
    >
      {isUnlocked ? (
        item ? (
          <div className="item-visual w-full h-full flex items-center justify-center cursor-grab">
            <img src={`/assets/items/${item.items?.icon}`} alt={item.items?.name || 'item'} className="w-10 h-10 object-contain" />
            {item.quantity > 1 && (
              <span className="absolute bottom-0 right-1 text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                {item.quantity}
              </span>
            )}
          </div>
        ) : (
          placeholderIcon
        )
      ) : (
        <Lock className="w-6 h-6 text-slate-600" />
      )}
    </div>
  );
};

export default InventorySlot;