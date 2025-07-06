import { useState, useEffect, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty';
  canBuild?: boolean;
}

const GRID_SIZE = 100; // La taille de notre grille finie
const CELL_SIZE_PX = 60; // Taille de chaque cellule en pixels pour le style

const BaseInterface = () => {
  const [gridData, setGridData] = useState<BaseCell[][] | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const initialScrollPerformed = useRef(false); // Nouvelle référence pour suivre le scroll initial

  // Étape 1: Générer la grille 100x100 une seule fois
  useEffect(() => {
    const newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({
        x,
        y,
        type: 'empty',
        canBuild: false,
      }))
    );

    // Placer le feu de camp au centre
    const center = Math.floor(GRID_SIZE / 2);
    newGrid[center][center].type = 'campfire';

    // Activer les cases adjacentes pour la construction
    const adjacentPositions = [
      { x: center - 1, y: center }, { x: center + 1, y: center },
      { x: center, y: center - 1 }, { x: center, y: center + 1 },
    ];
    adjacentPositions.forEach(pos => {
      if (newGrid[pos.y] && newGrid[pos.y][pos.x]) {
        newGrid[pos.y][pos.x].canBuild = true;
      }
    });

    setGridData(newGrid);
  }, []);

  // Étape 2: Centrer la vue sur le feu de camp après le rendu initial (une seule fois)
  useEffect(() => {
    if (initialScrollPerformed.current) {
      return; // Si le scroll initial a déjà été effectué, ne rien faire
    }

    if (viewportRef.current && gridData) {
      const viewport = viewportRef.current;
      const center = Math.floor(GRID_SIZE / 2);
      const centerPx = center * CELL_SIZE_PX;
      
      const scrollLeft = centerPx - viewport.offsetWidth / 2 + CELL_SIZE_PX / 2;
      const scrollTop = centerPx - viewport.offsetHeight / 2 + CELL_SIZE_PX / 2;

      // Utiliser un timeout pour s'assurer que la grille est rendue et a ses dimensions
      const timeoutId = setTimeout(() => {
        viewport.scrollTo({ left: scrollLeft, top: scrollTop });
        initialScrollPerformed.current = true; // Marquer le scroll initial comme effectué
      }, 0); 

      return () => clearTimeout(timeoutId);
    }
  }, [gridData]); // Dépend de gridData pour s'assurer qu'il s'exécute après que gridData soit peuplé pour la première fois

  const handleCellClick = (x: number, y: number) => {
    if (!gridData) return;

    const cell = gridData[y][x];
    if (!cell.canBuild || cell.type !== 'empty') return;

    const newGrid = gridData.map(row => row.map(c => ({ ...c })));

    newGrid[y][x].type = 'foundation';
    newGrid[y][x].canBuild = false;

    const adjacentPositions = [
      { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
    ];
    adjacentPositions.forEach(pos => {
      if (newGrid[pos.y] && newGrid[pos.y][pos.x] && newGrid[pos.y][pos.x].type === 'empty') {
        newGrid[pos.y][pos.x].canBuild = true;
      }
    });

    setGridData(newGrid);

    // Centrer la vue sur la nouvelle fondation
    const viewport = viewportRef.current;
    if (viewport) {
      const scrollLeft = x * CELL_SIZE_PX - viewport.offsetWidth / 2 + CELL_SIZE_PX / 2;
      const scrollTop = y * CELL_SIZE_PX - viewport.offsetHeight / 2 + CELL_SIZE_PX / 2;

      viewport.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: 'smooth',
      });
    }
  };

  const getCellContent = (cell: BaseCell) => {
    if (cell.type === 'campfire') return "🔥";
    if (cell.type === 'foundation') return ""; // Pas d'emoji pour la fondation
    if (cell.canBuild) return <Plus className="w-6 h-6 text-gray-400" />;
    return "";
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-200/10 border-orange-400/30";
      case 'foundation': return "bg-gray-600 border-gray-500"; // Nouveau style pour la fondation
      case 'empty':
        if (cell.canBuild) return "bg-gray-700/50 border-gray-600 hover:bg-gray-600/50 cursor-pointer border-dashed";
        return "bg-gray-800/50 border-gray-700/20";
      default: return "bg-gray-800/50 border-gray-700/20";
    }
  };

  if (!gridData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Génération de la base...</p>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-auto bg-gray-900 no-scrollbar"
    >
      <div
        className="relative"
        style={{
          width: GRID_SIZE * CELL_SIZE_PX,
          height: GRID_SIZE * CELL_SIZE_PX,
        }}
      >
        {gridData.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              className={cn(
                "absolute flex items-center justify-center text-2xl font-bold rounded border transition-colors",
                getCellStyle(cell)
              )}
              style={{
                left: x * CELL_SIZE_PX,
                top: y * CELL_SIZE_PX,
                width: CELL_SIZE_PX,
                height: CELL_SIZE_PX,
              }}
              disabled={!cell.canBuild}
            >
              {getCellContent(cell)}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default BaseInterface;