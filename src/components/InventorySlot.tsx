import { useDraggable } from "@dnd-kit/core";
import { cva, type VariantProps } from "class-variance-authority";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ItemIcon } from "./ItemIcon";
import { InventoryItem } from "@/types";
import { useEffect, useState } from "react";

const slotVariants = cva(
  "relative aspect-square rounded-md flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-secondary/50 border-2 border-secondary",
        highlight: "bg-primary/20 border-2 border-primary",
        ghost: "bg-transparent border-2 border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface InventorySlotProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof slotVariants> {
  item: InventoryItem | null;
  slotId: string;
  iconUrl?: string | null;
  disabled?: boolean;
}

const InventorySlot = ({ className, variant, item, slotId, iconUrl, disabled = false, ...props }: InventorySlotProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slotId,
    data: { type: "item", item },
    disabled: disabled || !item,
  });

  const [showQuantity, setShowQuantity] = useState(false);

  useEffect(() => {
    // Delay showing quantity to prevent flicker on drop
    const timer = setTimeout(() => {
      if (item?.quantity && item.quantity > 0 && !isDragging) {
        setShowQuantity(true);
      } else {
        setShowQuantity(false);
      }
    }, 10); // A very short delay to wait for state to settle
    return () => clearTimeout(timer);
  }, [item?.quantity, isDragging]);


  const style = {
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 100 : "auto",
  };

  const isBeingDragged = isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(slotVariants({ variant, className }))}
      {...props}
    >
      {item && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("absolute inset-0 item-visual", isBeingDragged && "opacity-0")}>
                <ItemIcon iconName={iconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
                {showQuantity && item.quantity > 0 && (
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                    {item.quantity}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">{item.items?.name}</p>
              <p className="text-sm text-muted-foreground">{item.items?.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export { InventorySlot, slotVariants };