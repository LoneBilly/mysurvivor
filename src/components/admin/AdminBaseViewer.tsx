import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { BaseConstruction } from "@/types/game";
import { showError } from "@/utils/toast";

const GRID_SIZE = 31;
const CELL_SIZE_PX = 50;
const CELL_GAP = 4;

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty';
}

interface AdminBaseViewerProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerUsername: string | null;
}

const AdminBaseViewer = ({ isOpen, onClose, playerId, playerUsername }: AdminBaseViewerProps) => {
  const [gridData, setGridData] = useState<BaseCell[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasCentered = useRef(false);
  const [campfirePosition, setCampfirePosition] = useState<{ x: number; y: number } | null>(null);

  const initializeGrid = useCallback(async (constructions: BaseConstruction[]) => {
    let newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({ x, y, type: 'empty' }))
    );

    let campPos: { x: number; y: number } | null = null;
    constructions.forEach((c: BaseConstruction) => {
      if (newGrid[c.y]?.[c.x]) {
        newGrid[c.y][c.x].type = c.type as 'campfire' | 'foundation';
        if (c.type === 'campfire') {
          campPos = { x: c.x, y: c.y };
        }
      }
    });

    setGridData(newGrid);
    setCampfirePosition(campPos);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      hasCentered.current = false;
      setLoading(true);
      const fetchConstructions = async () => {
        const { data, error } = await supabase
          .from('base_constructions')
          .select('x, y, type')
          .eq('player_id', playerId);
        
        if (error) {
          showError("Impossible de charger les données de la base.");
          setLoading(false);
        } else {
          initializeGrid(data as BaseConstruction[]);
        }
      };
      fetchConstructions();
    }
  }, [isOpen, playerId, initializeGrid]);

  const centerViewport = useCallback((x: number, y: number, smooth: boolean = true) => {
    if (!viewportRef.current) return;
    
    const viewport = viewportRef.current;
    const cellCenterX = x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const cellCenterY = y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    
    const scrollLeft = cellCenterX - viewport.clientWidth / 2;
    const scrollTop = cellCenterY - viewport.clientHeight / 2;

    viewport.scrollTo({
      left: scrollLeft,
      top: scrollTop,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useLayoutEffect(() => {
    if (isOpen && !loading && gridData && campfirePosition && viewportRef.current && !hasCentered.current) {
      centerViewport(campfirePosition.x, campfirePosition.y, false);
      hasCentered.current = true;
    }
  }, [isOpen, loading, gridData, campfirePosition, centerViewport]);

  const getCellContent = (cell: BaseCell) => {
    if (cell.type === 'campfire') return "🔥";
    return "";
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-400/20 border-orange-400/30";
      case 'foundation': return "bg-white/20 border-white/30";
      default: return "bg-black/20 border-white/10";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl p-6 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Base de {playerUsername || 'Joueur'}</DialogTitle>
        </DialogHeader>
        <div className="relative flex-grow mt-4 min-h-0">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <>
              <div
                ref={viewportRef}
                className="absolute inset-0 overflow-auto no-scrollbar rounded-lg"
              >
                <div
                  className="relative"
                  style={{
                    width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
                    height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
                  }}
                >
                  {gridData?.map((row, y) =>
                    row.map((cell, x) => (
                      <div
                        key={`${x}-${y}`}
                        className={cn(
                          "absolute flex items-center justify-center text-2xl font-bold rounded-lg border",
                          getCellStyle(cell)
                        )}
                        style={{
                          left: x * (CELL_SIZE_PX + CELL_GAP),
                          top: y * (CELL_SIZE_PX + CELL_GAP),
                          width: CELL_SIZE_PX,
                          height: CELL_SIZE_PX,
                        }}
                      >
                        {getCellContent(cell)}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <Button
                onClick={() => {
                  if (campfirePosition) centerViewport(campfirePosition.x, campfirePosition.y);
                }}
                variant="secondary"
                size="icon"
                className="absolute bottom-4 right-4 z-10 rounded-full shadow-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white"
              >
                <LocateFixed className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminBaseViewer;