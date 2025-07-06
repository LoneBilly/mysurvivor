import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty';
  canBuild?: boolean;
}

interface BaseInterfaceProps {
  onBack: () => void;
}

const BaseInterface = ({ onBack }: BaseInterfaceProps) => {
  const [baseGrid, setBaseGrid] = useState<Map<string, BaseCell>>(new Map());
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  
  // Taille de la grille visible (7x7 comme la carte principale)
  const GRID_SIZE = 7;
  const CENTER = Math.floor(GRID_SIZE / 2);

  // Initialiser la base avec le feu de camp au centre
  useEffect(() => {
    const initialGrid = new Map<string, BaseCell>();
    
    // Ajouter le feu de camp au centre
    const campfireKey = `${CENTER},${CENTER}`;
    initialGrid.set(campfireKey, {
      x: CENTER,
      y: CENTER,
      type: 'campfire'
    });

    // Ajouter les cases adjacentes avec possibilité de construire
    const adjacentPositions = [
      { x: CENTER - 1, y: CENTER },
      { x: CENTER + 1, y: CENTER },
      { x: CENTER, y: CENTER - 1 },
      { x: CENTER, y: CENTER + 1 },
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
      
      // Si la case n'existe pas ou est vide, la marquer comme constructible
      if (!existingCell || existingCell.type === 'empty') {
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
        return "bg-gray-50 border-gray-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const handleCellClick = (x: number, y: number) => {
    const cell = getCell(x, y);
    if (cell.canBuild && cell.type === 'empty') {
      addFoundation(x, y);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header de la base */}
      <header className="h-[10vh] bg-gray-800 border-b border-gray-700 text-white px-4 flex items-center justify-between shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-200 hover:bg-gray-700 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la carte</span>
        </Button>
        
        <div className="flex items-center space-x-2">
          <span className="text-lg md:text-xl font-bold text-white">
            Ma Base
          </span>
        </div>
        
        <div className="w-24"></div> {/* Spacer pour centrer le titre */}
      </header>

      {/* Grille de la base */}
      <main className="flex-1 flex items-center justify-center p-4 bg-gray-900 min-h-0">
        <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
          <div className="grid grid-cols-7 gap-1 md:gap-2 w-full h-full">
            {Array.from({ length: GRID_SIZE }, (_, y) =>
              Array.from({ length: GRID_SIZE }, (_, x) => {
                const cell = getCell(x + viewOffset.x, y + viewOffset.y);
                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => handleCellClick(x + viewOffset.x, y + viewOffset.y)}
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
      </main>

      {/* Footer avec informations de la base */}
      <footer className="bg-gray-800 border-t border-gray-700 text-white p-4">
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Cliquez sur les <Plus className="inline w-4 h-4 mx-1" /> pour ajouter des fondations
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BaseInterface;