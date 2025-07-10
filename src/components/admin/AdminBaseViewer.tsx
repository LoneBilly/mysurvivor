import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { BaseConstruction } from "@/types/game";
import { showError, showSuccess } from "@/utils/toast";
import ActionModal from "@/components/ActionModal";

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
  const [actionModalState, setActionModalState] = useState<{ isOpen: boolean; cell: BaseCell | null }>({ isOpen: false, cell: null });

  const fetchConstructions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('base_constructions')
      .select('x, y, type')
      .eq('player_id', playerId);
    
    if (error) {
      showError("Impossible de charger les données de la base.");
      setLoading(false);
    } else {
      let newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
        Array.from({ length: GRID_SIZE }, (_, x) => ({ x, y, type: 'empty' }))
      );
      let campPos: { x: number; y: number } | null = null;
      (data as BaseConstruction[]).forEach((c) => {
        if (newGrid[c.y]?.[c.x]) {
          newGrid[c.y][c.x].type = c.type as 'campfire' | 'foundation';
          if (c.type === 'campfire') campPos = { x: c.x, y: c.y };
        }
      });
      setGridData(newGrid);
      setCampfirePosition(campPos);
    }
    setLoading(false);
  }, [playerId]);

  useEffect(() => {
    if (isOpen) {
      hasCentered.current = false;
      fetchConstructions();
    }
  }, [isOpen, fetchConstructions]);

  const centerViewport = useCallback((x: number, y: number, smooth: boolean = true) => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;
    const cellCenterX = x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const cellCenterY = y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const scrollLeft = cellCenterX - viewport.clientWidth / 2;
    const scrollTop = cellCenterY - viewport.clientHeight / 2;
    viewport.scrollTo({ left: scrollLeft, top: scrollTop, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useLayoutEffect(() => {
    if (isOpen && !loading && gridData && campfirePosition && viewportRef.current && !hasCentered.current) {
      centerViewport(campfirePosition.x, campfirePosition.y, false);
      hasCentered.current = true;
    }
  }, [isOpen, loading, gridData, campfirePosition, centerViewport]);

  const handleCellClick = (cell: BaseCell) => {
    if (cell.type === 'campfire') {
      showError("Le feu de camp ne peut pas être modifié.");
      return;
    }
    setActionModalState({ isOpen: true, cell });
  };

  const closeActionModal = () => {
    setActionModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteConstruction = async () => {
    const cell = actionModalState.cell;
    if (!cell) return;

    const { error } = await supabase.from('base_constructions').delete().match({ player_id: playerId, x: cell.x, y: cell.y });
    if (error) {
      showError("Erreur de suppression.");
    } else {
      showSuccess("Construction supprimée.");
      fetchConstructions();
    }
    closeActionModal();
  };

  const handleBuildFoundation = async () => {
    const cell = actionModalState.cell;
    if (!cell) return;

    const { error } = await supabase.from('base_constructions').insert({ player_id: playerId, x: cell.x, y: cell.y, type: 'foundation' });
    if (error) {
      showError("Erreur de construction.");
    } else {
      showSuccess("Fondation construite.");
      fetchConstructions();
    }
    closeActionModal();
  };

  const getCellContent = (cell: BaseCell) => (cell.type === 'campfire' ? "🔥" : "");
  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-400/20 border-orange-400/30";
      case 'foundation': return "bg-white/20 border-white/30";
      default: return "bg-black/20 border-white/10";
    }
  };

  return (
    <>
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
                <div ref={viewportRef} className="absolute inset-0 overflow-auto no-scrollbar rounded-lg">
                  <div className="relative" style={{ width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP), height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP) }}>
                    {gridData?.map((row, y) =>
                      row.map((cell, x) => (
                        <button
                          key={`${x}-${y}`}
                          onClick={() => handleCellClick(cell)}
                          className={cn("absolute flex items-center justify-center text-2xl font-bold rounded-lg border transition-colors hover:border-sky-400", getCellStyle(cell))}
                          style={{ left: x * (CELL_SIZE_PX + CELL_GAP), top: y * (CELL_SIZE_PX + CELL_GAP), width: CELL_SIZE_PX, height: CELL_SIZE_PX }}
                        >
                          {getCellContent(cell)}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <Button onClick={() => { if (campfirePosition) centerViewport(campfirePosition.x, campfirePosition.y); }} variant="secondary" size="icon" className="absolute bottom-4 right-4 z-10 rounded-full shadow-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white">
                  <LocateFixed className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ActionModal
        isOpen={actionModalState.isOpen}
        onClose={closeActionModal}
        title={actionModalState.cell ? `Modifier la case (${actionModalState.cell.x}, ${actionModalState.cell.y})` : ''}
        description="Choisissez une action pour cette case."
        actions={[
          ...(actionModalState.cell?.type !== 'empty' ? [{ label: `Supprimer ${actionModalState.cell?.type}`, onClick: handleDeleteConstruction, variant: 'destructive' as const }] : []),
          ...(actionModalState.cell?.type === 'empty' ? [{ label: 'Construire une fondation', onClick: handleBuildFoundation, variant: 'default' as const }] : []),
          { label: 'Annuler', onClick: closeActionModal, variant: 'secondary' as const }
        ]}
      />
    </>
  );
};

export default AdminBaseViewer;