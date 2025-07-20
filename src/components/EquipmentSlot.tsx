import { cn } from "@/lib/utils";
import { InventoryItem } from "@/types/game";
import ItemIcon from "./ItemIcon";
import { useGame } from "@/contexts/GameContext";
import { Shield, Backpack, Sword, Footprints, Car } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type EquipmentSlotType = 'armor' | 'backpack' | 'weapon' | 'shoes' | 'vehicle';

interface EquipmentSlotProps {
  slotType: EquipmentSlotType;
  label: string;
  item: InventoryItem | null;
  onDragStart: (item: InventoryItem, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  isDragOver: boolean;
  onItemClick: (item: InventoryItem) => void;
}

const slotIcons = {
  armor: Shield,
  backpack: Backpack,
  weapon: Sword,
  shoes: Footprints,
  vehicle: Car,
};

const EquipmentSlot = ({ slotType, label, item, onDragStart, isDragOver, onItemClick }: EquipmentSlotProps) => {
  const { getIconUrl } = useGame();
  const Icon = slotIcons[slotType];

  const handleInteractionStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (item) {
      onDragStart(item, e.currentTarget as HTMLDivElement, e);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-slot-type={slotType}
            className={cn(
              "relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-colors",
              isDragOver ? "bg-sky-500/20 border-sky-500" : "bg-black/20 border-slate-600",
              item ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
            onClick={() => item && onItemClick(item)}
          >
            {!item && <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500" />}
            {item && (
              <div
                className="w-full h-full"
                onMouseDown={handleInteractionStart}
                onTouchStart={handleInteractionStart}
              >
                <div className="absolute inset-0 item-visual">
                  <ItemIcon iconName={getIconUrl(item.items?.icon) || item.items?.icon} alt={item.items?.name || 'Objet'} />
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20 font-mono rounded-lg shadow-lg p-3">
          <p className="font-bold text-lg text-white">{label}</p>
          {item ? (
            <>
              <p className="text-sm text-gray-300 max-w-xs mt-1">{item.items?.name}</p>
              <p className="text-xs text-gray-500 mt-2 uppercase tracking-wider">{item.items?.type || 'Objet'}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Vide</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default EquipmentSlot;