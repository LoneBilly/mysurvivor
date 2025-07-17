import React from 'react';
import { useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { cn } from '@/lib/utils';

// Types d'objets déplaçables pour react-dnd
export const ItemTypes = {
  WORKBENCH_SLOT: 'workbench_slot',
  INVENTORY_SLOT: 'inventory_slot', // Au cas où vous voudriez glisser depuis l'inventaire
};

// Interface pour un objet en cours de déplacement
export interface DraggableItem {
  id: number | null; // ID de l'objet dans la table (inventaire ou workbench_items)
  slot: number; // Position dans la grille d'origine
  type: string; // Type d'objet (WORKBENCH_SLOT, INVENTORY_SLOT)
  item: any; // L'objet complet
}

interface DraggableWorkbenchSlotProps {
  item: any; // L'objet dans cet emplacement, ou null
  slot: number; // La position de cet emplacement (0, 1, 2)
  onDropItem: (draggedItem: DraggableItem, toSlot: number) => void; // Callback lors du drop
  children: React.ReactNode;
}

export const DraggableWorkbenchSlot: React.FC<DraggableWorkbenchSlotProps> = ({ item, slot, onDropItem, children }) => {
  // Hook pour rendre l'élément déplaçable
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.WORKBENCH_SLOT,
    item: { id: item?.id, slot, type: ItemTypes.WORKBENCH_SLOT, item },
    canDrag: () => !!item, // On ne peut glisser que s'il y a un objet
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [item, slot]);

  // Hook pour faire de l'élément une zone de dépôt
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.WORKBENCH_SLOT], // Accepte les objets de l'établi
    drop: (draggedItem: DraggableItem) => {
      if (draggedItem.slot !== slot) {
        onDropItem(draggedItem, slot);
      }
    },
    collect: (monitor: DropTargetMonitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [slot, onDropItem]);

  return (
    <div
      ref={drop} // Applique la ref de la zone de dépôt
      className={cn(
        'relative w-full h-full transition-all rounded-md',
        isOver && canDrop && 'bg-primary/20 ring-2 ring-primary' // Style au survol
      )}
    >
      <div
        ref={drag} // Applique la ref pour le glisser
        className={cn(
          'w-full h-full cursor-grab',
          isDragging && 'opacity-25' // Style pendant le glisser
        )}
      >
        {children}
      </div>
    </div>
  );
};