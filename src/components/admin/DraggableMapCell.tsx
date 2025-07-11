import { MapCell } from "@/types/game";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { useState } from "react";

interface DraggableMapCellProps {
  cell: MapCell;
  onDrop: (draggedCell: MapCell, targetCell: MapCell) => void;
  onSelect: (cell: MapCell) => void;
}

const DraggableMapCell = ({ cell, onDrop, onSelect }: DraggableMapCellProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const isUnknown = cell.type === 'unknown';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.dataTransfer.setData("application/json", JSON.stringify(cell));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedCellData = e.dataTransfer.getData("application/json");
    if (draggedCellData) {
      const draggedCell: MapCell = JSON.parse(draggedCellData);
      onDrop(draggedCell, cell);
    }
  };

  const handleClick = () => {
    // Pour éviter de déclencher le clic à la fin d'un glisser-déposer
    if (!isDragging) {
      onSelect(cell);
    }
  };

  const IconComponent = !isUnknown && cell.icon ? (LucideIcons as any)[cell.icon] : null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "relative aspect-square flex flex-col items-center justify-center p-1 text-center font-bold rounded-md border-2 transition-all duration-200 w-full h-full cursor-grab active:cursor-grabbing",
        isUnknown 
          ? "bg-gray-800/20 border-gray-700/30 hover:border-sky-500/50"
          : "border-gray-500/50 text-gray-300 bg-gray-900/30 hover:border-sky-500"
      )}
    >
      {IconComponent && <IconComponent className="w-1/3 h-1/3 mb-1" />}
      {!isUnknown && <span className="text-[10px] leading-tight">{cell.type}</span>}
      <span className={cn(
        "absolute text-gray-500",
        isUnknown ? "text-[10px] top-1/2 -translate-y-1/2" : "text-[8px] top-0 right-1"
      )}>
        ID:{cell.id}
      </span>
    </div>
  );
};

export default DraggableMapCell;