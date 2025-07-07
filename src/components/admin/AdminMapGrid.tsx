import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapCell } from "@/types/game";
import { Loader2 } from "lucide-react";
import DraggableMapCell from "./DraggableMapCell";

interface AdminMapGridProps {
  onMapUpdate: (changedCells: MapCell[]) => void;
}

const AdminMapGrid = ({ onMapUpdate }: AdminMapGridProps) => {
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMapLayout = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('map_layout').select('*').order('y').order('x');
      if (error) {
        console.error("Error fetching map layout:", error);
      } else {
        setMapLayout(data as MapCell[]);
      }
      setLoading(false);
    };
    fetchMapLayout();
  }, []);

  const handleDrop = (draggedCell: MapCell, targetCell: MapCell) => {
    if (draggedCell.id === targetCell.id) return;

    const newMapLayout = [...mapLayout];

    const draggedIndex = newMapLayout.findIndex(c => c.id === draggedCell.id);
    const targetIndex = newMapLayout.findIndex(c => c.id === targetCell.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create updated cell objects with swapped coordinates
    const updatedDraggedCell = { ...newMapLayout[draggedIndex], x: targetCell.x, y: targetCell.y };
    const updatedTargetCell = { ...newMapLayout[targetIndex], x: draggedCell.x, y: draggedCell.y };

    // Update the local state for re-rendering the grid
    newMapLayout[draggedIndex] = updatedDraggedCell;
    newMapLayout[targetIndex] = updatedTargetCell;
    
    setMapLayout(newMapLayout);
    
    // Pass only the two changed cells to the parent component
    onMapUpdate([updatedDraggedCell, updatedTargetCell]);
  };

  const generateGrid = (): (MapCell | null)[][] => {
    const grid: (MapCell | null)[][] = Array(7).fill(null).map(() => Array(7).fill(null));
    if (!mapLayout.length) return grid;

    mapLayout.forEach(cell => {
      if (!grid[cell.y]) grid[cell.y] = Array(7).fill(null);
      grid[cell.y][cell.x] = cell;
    });
    return grid;
  };

  const grid = generateGrid();

  if (loading) {
    return (
      <div className="bg-gray-800 p-2 rounded-lg shadow-lg h-[500px] w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 p-3 rounded-xl shadow-2xl border border-gray-700/50">
      <div className="grid grid-cols-7 gap-1.5 w-full">
        {grid.map((row, y) =>
          row.map((cell, x) =>
            (cell && cell.type !== 'unknown') ? (
              <DraggableMapCell key={cell.id} cell={cell} onDrop={handleDrop} />
            ) : (
              <div key={`${x}-${y}`} className="aspect-square bg-gray-800/20 rounded-md" />
            )
          )
        )}
      </div>
    </div>
  );
};

export default AdminMapGrid;