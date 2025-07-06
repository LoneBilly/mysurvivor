import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty';
  canBuild?: boolean;
}

const BaseInterface = () => {
  const [baseGrid, setBaseGrid] = useState<Map<string, BaseCell>>(new Map());
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  
  // Taille de la grille visible (7x7 comme la carte principale)
  const GRID_SIZE = 7;
  const CENTER = Math.floor(GRID_SIZE / 2);

  // Initialiser la base avec le feu de camp au centre de la vue
  useEffect(() => {
    const initialGrid = new Map<string, BaseCell>();
    
    // Le feu de camp est à la position (0, 0) dans le système de coordonnées de la base
    // mais affiché au centre de la grille visible
    const campfireKey = `0,0`;
    initialGrid.set(campfireKey, {
      x: 0,
      y: 0,
      type: 'campfire'
    });

    // Ajouter les cases adjacentes avec possibilité de construire
    const adjacentPositions = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
    ];

    adjacentPositions.forEach(pos => {
      const key = `${pos.x},${pos.y}`;
      initialGrid.set(key, {
        x: pos.x,
        y: pos.y,
        type: 'empty',
        canBuild: true
      });
    });

    setBaseGrid(initialGrid);
  }, []);

  const getCellKey = (x: number, y: number) => `${x},${y}`;

  const getCell = (x: number, y: number): BaseCell => {
    const key = getCellKey(x, y);
    return baseGrid.get(key) || { x, y, type: 'empty', canBuild: false };
  };

  const addFoundation = (x: number, y: number) => {
    const newGrid = new Map(baseGrid);
    
    // Ajouter la nouvelle fondation
    const foundationKey = getCellKey(x, y);
    newGrid.set(foundationKey, {
      x,
      y,
      type: 'foundation'
    });

    // Retirer la possibilité de construire sur cette case
    const currentCell = newGrid.get(foundationKey);
    if (currentCell) {
      currentCell.canBuild = false;
    }

    // Ajouter les cases adjacentes avec possibilité de construire
    const adjacentPositions = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    adjacentPositions.forEach(pos => {
      const key = getCellKey(pos.x, pos.y);
      const existingCell = newGrid.get(key);
      
      // Si la case n'existe pas ou est vide sans structure, la marquer comme constructible
      if (!existingCell || (existingCell.type === 'empty' && existingCell.type !== 'campfire' && existingCell.type !== 'foundation')) {
        newGrid.set(key, {
          x: pos.x,
          y: pos.y,
          type: 'empty',
          canBuild: true
        });
      }
    });

    setBaseGrid(newGrid);
  };

  const getCellContent = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire':
        return "🔥";
      case 'foundation':
        return "🏗️";
      case 'empty':
        return cell.canBuild ? <Plus className="w-4 h-4 text-gray-400" /> : "";
      default:
        return "";
    }
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire':
        return "bg-orange-200 border-orange-400 text-orange-800";
      case 'foundation':
        return "bg-stone-200 border-stone-400 text-stone-800";
      case 'empty':
        if (cell.canBuild) {
          return "bg-gray-100 border-gray-300 hover:bg-gray-200 cursor-pointer border-dashed";
        }
        return "bg-gray-600 border-gray-500"; // Cases vides non constructibles (grille infinie)
      default:
        return "bg-gray-600 border-gray-500";
    }
  };

  const handleCellClick = (x: number, y: number) => {
    const cell = getCell(x, y);
    if (cell.canBuild && cell.type === 'empty') {
      addFoundation(x, y);
    }
  };

  // Gérer le déplacement de la vue avec les flèches du clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setViewOffset(prev => ({ ...prev, y: prev.y - 1 }));
          break;
        case 'ArrowDown':
          setViewOffset(prev => ({ ...prev, y: prev.y + 1 }));
          break;
        case 'ArrowLeft':
          setViewOffset(prev => ({ ...prev, x: prev.x - 1 }));
          break;
        case 'ArrowRight':
          setViewOffset(prev => ({ ...prev, x: prev.x + 1 }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
      <div className="grid grid-cols-7 gap-1 md:gap-2 w-full h-full">
        {Array.from({ length: GRID_SIZE }, (_, row) =>
          Array.from({ length: GRID_SIZE }, (_, col) => {
            // Calculer les coordonnées réelles dans la grille infinie
            const realX = col - CENTER + viewOffset.x;
            const realY = row - CENTER + viewOffset.y;
            const cell = getCell(realX, realY);
            
            return (
              <button
                key={`${col}-${row}`}
                onClick={() => handleCellClick(realX, realY)}
                className={cn(
                  "relative aspect-square flex items-center justify-center text-lg md:text-xl font-bold rounded border-2 transition-colors",
                  getCellStyle(cell)
                )}
                disabled={!cell.canBuild || cell.type !== 'empty'}
              >
                {getCellContent(cell)}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BaseInterface;