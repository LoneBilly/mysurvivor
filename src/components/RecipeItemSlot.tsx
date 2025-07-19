import { cn } from "@/lib/utils";
import ItemIcon from "./ItemIcon";
import { useGame } from "@/contexts/GameContext";
import { Item } from "@/types/game";

interface RecipeItemSlotProps {
  item: Item | null;
  quantity: number | null;
  isEmpty?: boolean;
  isResult?: boolean;
  slotNumber?: number; // New prop for slot numbering
}

const RecipeItemSlot = ({ item, quantity, isEmpty = false, isResult = false, slotNumber }: RecipeItemSlotProps) => {
  const { getIconUrl } = useGame();

  const iconUrl = item ? getIconUrl(item.icon) : null;

  return (
    <div
      className={cn(
        "relative aspect-square flex flex-col items-center justify-center p-1 rounded-lg border flex-shrink-0",
        isResult ? "w-28 h-28 bg-slate-700/50 border-slate-600" : "w-20 h-20 bg-slate-700/50 border-slate-600",
        isEmpty ? "bg-black/20 border-dashed border-slate-600" : ""
      )}
    >
      {slotNumber && (
        <span className="absolute top-1 left-2 text-xs font-bold text-gray-400">
          {slotNumber}
        </span>
      )}
      {isEmpty ? (
        <span className="text-gray-500 text-xs">Vide</span>
      ) : (
        <>
          <div className={cn("relative", isResult ? "w-16 h-16" : "w-10 h-10")}>
            <ItemIcon iconName={iconUrl || item?.icon} alt={item?.name || 'Objet'} />
          </div>
          <p className={cn(
            "font-semibold mt-1 px-1 text-center break-words text-wrap",
            isResult ? "text-sm" : "text-xs"
          )}>
            {item?.name}
          </p>
          {quantity !== null && quantity > 0 && (
            <p className={cn(
              "text-gray-400",
              isResult ? "text-sm" : "text-[10px]"
            )}>
              x{quantity}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default RecipeItemSlot;