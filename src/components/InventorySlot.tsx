import { useRef } from 'react';
import { cn } from "@/lib/utils";
import { InventoryItem, ChestItem } from '@/types/game';
import { Lock } from 'lucide-react';

type DraggableItem = InventoryItem | ChestItem;

interface InventorySlotProps {
  item: DraggableItem | null;
  index: number;
  isUnlocked: boolean;
  onDragStart: (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  onItemClick: (item: DraggableItem) => void;
  isBeingDragged: boolean;
  isDragOver: boolean;
}

const InventorySlot = ({ item, index, isUnlocked, onDragStart, onItemClick, isBeingDragged, isDragOver }: InventorySlotProps) => {
  const slotRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (item && slotRef.current && isUnlocked) {
      onDragStart(index, slotRef.current, e);
    }
  };

  const handleClick = () => {
    if (item && isUnlocked) {
      onItemClick(item);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="relative aspect-square rounded-md bg-black/50 flex items-center justify-center border-2 border-dashed border-slate-700">
        <Lock className="w-6 h-6 text-slate-600" />
      </div>
    );
  }

  return (
    <div
      ref={slotRef}
      data-slot-index={index}
      onClick={handleClick}
      className={cn(
        "relative aspect-square rounded-md transition-all duration-200",
        isDragOver ? "bg-green-500/30 ring-2 ring-green-400" : "bg-black/30",
        item ? "border-slate-600 hover:border-slate-400" : "border-dashed border-slate-700",
        "border-2"
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {item && item.items ? (
        <div
          className={cn(
            "item-visual w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing rounded-md border-2",
            "border-transparent",
            isBeingDragged && "invisible"
          )}
        >
          <img src={`/items/${item.items.icon}`} alt={item.items.name || ''} className="w-8 h-8 object-contain" />
          {item.quantity > 1 && (
            <div className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">
              {item.quantity}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
  );
};

export default InventorySlot;