import { useDrag, useDrop } from 'react-dnd';
import { MapCell } from '@/types/game';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { PlusCircle } from 'lucide-react';

interface DraggableMapCellProps {
  cell: MapCell;
  onClick: (cell: MapCell) => void;
  onDropCell: (fromId: number, toId: number) => void;
  isBeingDragged: boolean;
}

const DraggableMapCell = ({ cell, onClick, onDropCell, isBeingDragged }: DraggableMapCellProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'MAP_CELL',
    item: { id: cell.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'MAP_CELL',
    drop: (item: { id: number }) => onDropCell(item.id, cell.id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: cell.id }));
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Logic for drag end if needed
  };

  const IconComponent = cell.icon ? (LucideIcons as any)[cell.icon] || LucideIcons.MapPin : LucideIcons.MapPin;
  const isEmpty = !cell.type;

  return (
    <div
      ref={(node) => drag(drop(node))}
      draggable={!isEmpty}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick(cell)}
      className={cn(
        "w-24 h-24 border border-gray-700 flex flex-col items-center justify-center text-center p-1 cursor-pointer relative transition-colors",
        isEmpty ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800',
        isDragging || isBeingDragged ? 'opacity-30' : 'opacity-100',
        isOver && 'bg-blue-500/20 border-blue-500'
      )}
      style={{ touchAction: 'none' }}
    >
      {isEmpty ? (
        <PlusCircle className="w-8 h-8 text-gray-500" />
      ) : (
        <>
          <IconComponent className="w-8 h-8" />
          <span className="text-xs mt-1 font-semibold">{cell.type}</span>
          <span className="absolute top-1 right-1 text-xs text-gray-500">{cell.id}</span>
        </>
      )}
    </div>
  );
};

export default DraggableMapCell;