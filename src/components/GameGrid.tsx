import React from 'react';
import { Home, TreePine, Mountain, Waves, Building, Skull, HelpCircle } from 'lucide-react';

interface GameGridProps {
  grid: { type: string; icon: string; discovered: boolean; isPlayer: boolean; isBase: boolean }[][];
  onCellClick: (x: number, y: number) => void;
}

const iconMap: { [key: string]: React.ElementType } = {
  'Forêt': TreePine,
  'Montagne': Mountain,
  'Eau': Waves,
  'Ville': Building,
  'Base': Home,
  'Danger': Skull,
  'Inconnue': HelpCircle,
};

const GameGrid: React.FC<GameGridProps> = ({ grid, onCellClick }) => {
  if (!grid || grid.length === 0) {
    return <div>Chargement de la grille...</div>;
  }

  return (
    <div className="bg-slate-900 border border-slate-700 p-2 md:p-4 rounded-xl shadow-2xl h-full aspect-square flex items-center justify-center">
      <div className="grid grid-cols-7 gap-1.5 md:gap-2 w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const IconComponent = iconMap[cell.type] || HelpCircle;
            const isClickable = cell.discovered;

            return (
              <div
                key={`${x}-${y}`}
                onClick={() => isClickable && onCellClick(x, y)}
                className={`
                  relative aspect-square flex items-center justify-center rounded-lg 
                  transition-all duration-300 ease-in-out
                  ${cell.discovered ? 'bg-slate-700/60' : 'bg-slate-800'}
                  ${isClickable ? 'cursor-pointer hover:bg-slate-600/80' : 'cursor-not-allowed'}
                  ${cell.isPlayer ? 'ring-2 ring-cyan-400 ring-inset shadow-[0_0_12px_2px_theme(colors.cyan.500)]' : ''}
                `}
              >
                {cell.discovered && (
                  <IconComponent
                    className={`
                      w-5 h-5 md:w-6 md:h-6
                      ${cell.isPlayer ? 'text-cyan-300' : 'text-slate-300'}
                    `}
                  />
                )}
                {cell.isBase && !cell.isPlayer && (
                  <Home className="absolute bottom-1 right-1 w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameGrid;