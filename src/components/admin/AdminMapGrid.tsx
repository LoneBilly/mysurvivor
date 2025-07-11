import { MapCell } from "@/types/game";
import DraggableMapCell from "./DraggableMapCell";
import { useRef, useMemo, useState, useEffect, useCallback } from "react";

interface AdminMapGridProps {
  mapLayout: MapCell[];
  onMapUpdate: (newLayout: MapCell[], changedCells: MapCell[]) => void;
  onZoneSelect: (cell: MapCell) => void;
}

const CELL_SIZE_PX = 60; // Assurez-vous que cette valeur correspond à celle utilisée dans DraggableMapCell
const CELL_GAP = 4; // Assurez-vous que cette valeur correspond à celle utilisée dans DraggableMapCell

const AdminMapGrid = ({ mapLayout, onMapUpdate, onZoneSelect }: AdminMapGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedCell, setSelectedCell] = useState<MapCell | null>(null);

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

  const generateGrid = useMemo((): (MapCell | null)[][] => {
    const grid: (MapCell | null)[][] = Array(7).fill(null).map(() => Array(7).fill(null));
    if (!mapLayout.length) return grid;

    mapLayout.forEach(cell => {
      if (cell.y >= 0 && cell.y < 7 && cell.x >= 0 && cell.x < 7) {
        grid[cell.y][cell.x] = cell;
      }
    });
    return grid;
  }, [mapLayout]);

  const centerOnCell = useCallback((cell: MapCell) => {
    if (!gridRef.current) return;
    
    // Utiliser un attribut data- pour trouver la cellule spécifique
    const cellElement = gridRef.current.querySelector(`[data-cell-id="${cell.id}"]`);
    if (cellElement) {
      const cellRect = cellElement.getBoundingClientRect();
      const gridRect = gridRef.current.getBoundingClientRect();
      
      // Calculer le décalage pour centrer la cellule dans la grille
      const scrollY = cellRect.top - gridRect.top + cellRect.height / 2 - gridRect.height / 2;
      
      gridRef.current.scrollTo({
        top: scrollY,
        behavior: 'smooth'
      });
    }
  }, []);

  const handleCellSelect = (cell: MapCell) => {
    setSelectedCell(cell);
    onZoneSelect(cell); // Appelle la fonction parent pour changer de vue
    centerOnCell(cell); // Centre la cellule sélectionnée
  };

  useEffect(() => {
    // Si une cellule est sélectionnée et que la grille est prête, centrez-la
    if (selectedCell && gridRef.current) {
      centerOnCell(selectedCell);
    }
  }, [selectedCell, centerOnCell]);


  return (
    <div className="bg-gray-900/50 p-3 rounded-xl shadow-2xl border border-gray-700/50 aspect-square max-w-full max-h-full flex flex-col">
      <div ref={gridRef} className="grid grid-cols-7 gap-1.5 w-full h-full overflow-y-auto no-scrollbar">
        {generateGrid.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <DraggableMapCell 
                key={cell.id}
                cell={cell}
                onDrop={handleDrop}
                onSelect={handleCellSelect}
                isSelected={selectedCell?.id === cell.id}
              />
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