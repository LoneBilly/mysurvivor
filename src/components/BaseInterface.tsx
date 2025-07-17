import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import CountdownTimer from "./CountdownTimer";
import { BuildingIcon } from "./BuildingIcon";
import { BaseConstruction } from "@/types/game";
import { cn } from "@/lib/utils";

interface BaseInterfaceProps {
  onSelectCell: (cell: { x: number, y: number, construction: BaseConstruction | null, isJob: boolean }) => void;
  refreshPlayerData: () => void;
}

const BaseInterface = ({ onSelectCell, refreshPlayerData }: BaseInterfaceProps) => {
  const { playerData } = useGame();
  const { baseConstructions, constructionJobs } = playerData;

  const baseGrid: (BaseConstruction | { isJob: true, job: any } | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));

  baseConstructions.forEach(c => {
    if (c.x >= 0 && c.x < 5 && c.y >= 0 && c.y < 5) {
      baseGrid[c.y][c.x] = c;
    }
  });

  constructionJobs.forEach(j => {
    if (j.x >= 0 && j.x < 5 && j.y >= 0 && j.y < 5) {
      baseGrid[j.y][j.x] = { isJob: true, job: j };
    }
  });

  const isAdjacentToConstruction = (x: number, y: number) => {
    if (baseConstructions.length === 0) return false;
    // Le feu de camp est toujours à la base, donc on peut construire autour
    if (baseConstructions.some(c => c.type === 'campfire')) return true;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (Math.abs(i) + Math.abs(j) !== 1) continue;
        const checkX = x + i;
        const checkY = y + j;
        if (checkX >= 0 && checkX < 5 && checkY >= 0 && checkY < 5) {
          if (baseConstructions.some(c => c.x === checkX && c.y === checkY)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Votre Base</CardTitle>
        <CardDescription>Gérez vos constructions et défenses.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2 mx-auto max-w-sm">
          {baseGrid.map((row, y) =>
            row.map((cell, x) => {
              if (cell && 'isJob' in cell && cell.isJob) {
                const job = cell.job;
                return (
                  <div key={`${x}-${y}`} className="relative aspect-square border border-yellow-500/50 rounded-md flex items-center justify-center bg-black/30 cursor-pointer" onClick={() => onSelectCell({ x, y, construction: null, isJob: true })}>
                    <div className="flex flex-col items-center justify-center text-white gap-1">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Loader2 className="w-full h-full animate-spin" />
                      </div>
                      <span className="text-xs font-mono">
                        <CountdownTimer endTime={job.ends_at} onComplete={refreshPlayerData} />
                      </span>
                    </div>
                    <div className="absolute bottom-1 right-1">
                      <BuildingIcon type={job.type} className="w-4 h-4" />
                    </div>
                  </div>
                );
              }

              if (cell) {
                const construction = cell as BaseConstruction;
                return (
                  <div key={`${x}-${y}`} className="relative aspect-square border border-gray-700 rounded-md flex items-center justify-center bg-gray-800/50 cursor-pointer hover:bg-gray-700/50 transition-colors" onClick={() => onSelectCell({ x, y, construction, isJob: false })}>
                    <BuildingIcon type={construction.type} className="w-8 h-8" />
                  </div>
                );
              }

              const canBuild = isAdjacentToConstruction(x, y);
              return (
                <div
                  key={`${x}-${y}`}
                  className={cn(
                    "relative aspect-square border border-dashed border-gray-700 rounded-md flex items-center justify-center",
                    canBuild ? "cursor-pointer hover:bg-gray-800/50" : "cursor-not-allowed bg-black/20"
                  )}
                  onClick={() => canBuild && onSelectCell({ x, y, construction: null, isJob: false })}
                >
                  {canBuild && <Plus className="w-6 h-6 text-gray-600" />}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BaseInterface;