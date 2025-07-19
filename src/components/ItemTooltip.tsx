import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InventoryItem } from "@/types/game";

interface ItemTooltipProps {
  item: InventoryItem;
  children: React.ReactNode;
}

const ItemTooltip = ({ item, children }: ItemTooltipProps) => {
  if (!item.items) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20 font-mono rounded-lg shadow-lg p-3">
          <p className="font-bold text-lg text-white">{item.items.name}</p>
          {item.items.description && <p className="text-sm text-gray-300 max-w-xs mt-1">{item.items.description}</p>}
          <p className="text-xs text-gray-500 mt-2 uppercase tracking-wider">{item.items.type || 'Objet'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ItemTooltip;