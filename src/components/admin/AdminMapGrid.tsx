import { MapCell } from "@/types/game";
import DraggableMapCell from "./DraggableMapCell";

interface AdminMapGridProps {
  mapLayout: MapCell[];
  onMapUpdate: (newLayout: MapCell[], changedCells: MapCell[]) => void;
  onZoneSelect: (cell: MapCell) => void;
}

const AdminMapGrid = ({ mapLayout, onMapUpdate, onZoneSelect }: AdminMapGridProps) => {
  const handleDrop = (draggedCell: MapCell, targetCell: MapCell) => {
    if (draggedCell.id === targetCell.id) return;

    const newMapLayout = [...mapLayout];

    const draggedIndex = newMapLayout.findIndex(c => c.id === draggedCell.id);
    const targetIndex = newMapLayout.findIndex(c => c.id === targetCell.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedDraggedCell = { ...newMapLayout[draggedIndex], x: targetCell.x, y: targetCell.y };
    const updatedTargetCell = { ...newMapLayout[targetIndex], x: draggedCell.x, y: draggedCell.y };

    newMapLayout[draggedIndex] = updatedDraggedCell;
    newMapLayout[targetIndex] = updatedTargetCell;
    
    onMapUpdate(newMapLayout, [updatedDraggedCell, updatedTargetCell]);
  };

  const generateGrid = (): (MapCell | null)[][] => {
    const grid: (MapCell | null)[][] = Array(7).fill(null).map(() => Array(7).fill(null));
    if (!mapLayout.length) return grid;

    mapLayout
      .filter(cell => cell.type !== 'unknown' && !(cell.x === 3 && cell.y === 1))
      .forEach(cell => {
        if (!grid[cell.y]) grid[cell.y] = Array(7).fill(null);
        grid[cell.y][cell.x] = cell;
      });
    return grid;
  };

  const grid = generateGrid();

  return (
    <div className="bg-gray-900/50 p-3 rounded-xl shadow-2xl border border-gray-700/50 aspect-square max-w-full max-h-full">
      <div className="grid grid-cols-7 gap-1.5 w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <DraggableMapCell key={cell.id} cell={cell} onDrop={handleDrop} onSelect={onZoneSelect} />
            ) : (
              <div key={`${x}-${y}`} className="aspect-square rounded-md" />
            )
          )
        )}
      </div>
    </div>
  );
};

export default AdminMapGrid;