import { MapCell } from "@/types/game";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { useState } from "react";
import { Plus } from "lucide-react";

interface DraggableMapCellProps {
  cell: MapCell;
  onDrop: (draggedCell: MapCell, targetCell: MapCell) => void;
  onSelect: (cell: MapCell) => void;
}

const DraggableMapCell = ({ cell, onDrop, onSelect }: DraggableMapCellProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const isUndefined = !cell.type;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (isUndefined) {
      e.preventDefault();
      return;
    }
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
    if (!isDragging) {
      onSelect(cell);
    }
  };

  const IconComponent = !isUndefined && cell.icon ? (LucideIcons as any)[cell.icon] : null;

  return (
    <div
      draggable={!isUndefined}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "relative aspect-square flex flex-col items-center justify-center p-1 text-center font-bold rounded-md border-2 transition-all duration-200 w-full h-full",
        isUndefined 
          ? "bg-gray-800/20 border-dashed border-gray-700/30 hover:border-sky-500/50 cursor-pointer"
          : "border-gray-500/50 text-gray-300 bg-gray-900/30 hover:border-sky-500 cursor-grab active:cursor-grabbing"
      )}
    >
      {isUndefined ? (
        <Plus className="w-1/2 h-1/2 text-gray-500" />
      ) : (
        <>
          {IconComponent && <IconComponent className="w-1/3 h-1/3 mb-1" />}
          <span className="text-[10px] leading-tight">{cell.type}</span>
        </>
      )}
      <span className={cn(
        "absolute text-gray-500 text-[8px]",
        isUndefined ? "bottom-1 right-1" : "top-0 right-1"
      )}>
        ID:{cell.id}
      </span>
    </div>
  );
};

export default DraggableMapCell;