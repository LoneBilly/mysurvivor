import { MapCell } from "@/types/game";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

interface DraggableMapCellProps {
  cell: MapCell;
  onDrop: (draggedCell: MapCell, targetCell: MapCell) => void;
}

const DraggableMapCell = ({ cell, onDrop }: DraggableMapCellProps) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("application/json", JSON.stringify(cell));
    e.dataTransfer.effectAllowed = "move";
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

  const IconComponent = cell.icon ? (LucideIcons as any)[cell.icon] : LucideIcons.HelpCircle;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative aspect-square flex flex-col items-center justify-center p-1 text-center font-bold rounded-md border-2 transition-all duration-200 w-full h-full cursor-grab active:cursor-grabbing",
        "border-gray-500/50 text-gray-300 bg-gray-900/30 hover:border-sky-500"
      )}
    >
      {IconComponent && <IconComponent className="w-1/3 h-1/3 mb-1" />}
      <span className="text-[10px] leading-tight">{cell.type}</span>
      <span className="absolute top-0 right-1 text-[8px] text-gray-500">ID:{cell.id}</span>
    </div>
  );
};

export default DraggableMapCell;