import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ItemIcon from "./ItemIcon";
import { InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import { Shield, Backpack, Footprints, Car } from "lucide-react";

const slotIcons = {
  armor: Shield,
  backpack: Backpack,
  shoes: Footprints,
  vehicle: Car,
};

const EquipmentSlot = ({ slotType, item, onClick, onDrop, onDragOver }: { slotType: keyof typeof slotIcons, item: InventoryItem | null, onClick: (item: InventoryItem | null) => void, onDrop: (e: React.DragEvent) => void, onDragOver: (e: React.DragEvent) => void }) => {
  const { getIconUrl } = useGame();
  const Icon = slotIcons[slotType];
  const iconUrl = item ? getIconUrl(item.items?.icon || null) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={() => onClick(item)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="w-20 h-20 bg-slate-800/50 border-2 border-slate-700 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-slate-700/70 hover:border-yellow-500/50 relative"
          >
            {item && iconUrl ? (
              <ItemIcon iconName={iconUrl} alt={item.items?.name || 'Objet équipé'} />
            ) : (
              <Icon className="w-10 h-10 text-slate-600" />
            )}
          </div>
        </TooltipTrigger>
        {item && (
          <TooltipContent side="right" className="bg-slate-900/80 backdrop-blur-sm text-white border-slate-700">
            <p className="font-bold">{item.items?.name}</p>
            <p className="text-sm text-gray-400">{item.items?.description}</p>
            <p className="text-xs text-gray-500 italic mt-1">{item.items?.type}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default EquipmentSlot;