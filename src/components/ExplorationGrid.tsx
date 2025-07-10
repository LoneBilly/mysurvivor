import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, Zap } from "lucide-react";

const GRID_SIZE = 51;
const CELL_SIZE_PX = 40;
const CELL_GAP = 4;
const ENTRANCE_X = 25;
const ENTRANCE_Y = 50;
const ORBIT_RADIUS_PX = 40;
const RENDER_BUFFER = 5; // Nombre de cases à afficher en dehors de l'écran

interface ExplorationGridProps {
  playerPosition: { x: number; y: number } | null;
  onCellClick: (x: number, y: number) => void;
  onCellHover: (x: number, y: number) => void;
  path: { x: number; y: number }[] | null;
  currentEnergy: number;
}

const ExplorationGrid = ({ playerPosition, onCellClick, onCellHover, path, currentEnergy }: ExplorationGridProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [exitIndicator, setExitIndicator] = useState({ visible: false, angle: 0, x: 0, y: 0 });
  const [playerIndicator, setPlayerIndicator] = useState({ visible: false, angle: 0 });
  const hasCentered = useRef(false);

  const [visibleRange, setVisibleRange] = useState<{
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
  } | null>(null);

  const centerViewport = useCallback((x: number, y: number, behavior: 'auto' | 'smooth' = 'auto') => {
    if (viewportRef.current) {
      const viewport = viewportRef.current;
      const cellCenterX = x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
      const cellCenterY = y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
      
      const scrollLeft = cellCenterX - viewport.clientWidth / 2;
      const scrollTop = cellCenterY - viewport.clientHeight / 2;

      viewport.scrollTo({ left: scrollLeft, top: scrollTop, behavior });
    }
  }, []);

  const updateIndicatorsAndVisibleCells = useCallback(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = viewport;

    // Mettre à jour les cellules visibles pour la virtualisation
    const rowStart = Math.max(0, Math.floor(scrollTop / (CELL_SIZE_PX + CELL_GAP)) - RENDER_BUFFER);
    const rowEnd = Math.min(GRID_SIZE - 1, Math.ceil((scrollTop + clientHeight) / (CELL_SIZE_PX + CELL_GAP)) + RENDER_BUFFER);
    const colStart = Math.max(0, Math.floor(scrollLeft / (CELL_SIZE_PX + CELL_GAP)) - RENDER_BUFFER);
    const colEnd = Math.min(GRID_SIZE - 1, Math.ceil((scrollLeft + clientWidth) / (CELL_SIZE_PX + CELL_GAP)) + RENDER_BUFFER);
    setVisibleRange({ rowStart, rowEnd, colStart, colEnd });

    // Mettre à jour les indicateurs hors écran
    if (!playerPosition) {
      setExitIndicator({ visible: false, angle: 0, x: 0, y: 0 });
      setPlayerIndicator({ visible: false, angle: 0 });
      return;
    }

    const playerPixelX = playerPosition.x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const playerPixelY = playerPosition.y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;

    const exitPixelX = ENTRANCE_X * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const exitPixelY = ENTRANCE_Y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const isExitVisible = exitPixelX >= scrollLeft && exitPixelX <= scrollLeft + clientWidth && exitPixelY >= scrollTop && exitPixelY <= scrollTop + clientHeight;
    
    setExitIndicator(prev => {
      if (isExitVisible) return prev.visible ? { ...prev, visible: false } : prev;
      const dx = exitPixelX - playerPixelX;
      const dy = exitPixelY - playerPixelY;
      const angleRad = Math.atan2(dy, dx);
      return { visible: true, angle: angleRad * (180 / Math.PI), x: playerPixelX - scrollLeft, y: playerPixelY - scrollTop };
    });

    const isPlayerVisible = playerPixelX >= scrollLeft && playerPixelX <= scrollLeft + clientWidth && playerPixelY >= scrollTop && playerPixelY <= scrollTop + clientHeight;
    setPlayerIndicator(prev => {
      if (isPlayerVisible) return prev.visible ? { ...prev, visible: false } : prev;
      const viewportCenterX = scrollLeft + clientWidth / 2;
      const viewportCenterY = scrollTop + clientHeight / 2;
      const dx = playerPixelX - viewportCenterX;
      const dy = playerPixelY - viewportCenterY;
      const angleRad = Math.atan2(dy, dx);
      return { visible: true, angle: angleRad * (180 / Math.PI) };
    });
  }, [playerPosition]);

  useLayoutEffect(() => {
    if (playerPosition && !hasCentered.current) {
      centerViewport(playerPosition.x, playerPosition.y, 'auto');
      hasCentered.current = true;
      setTimeout(updateIndicatorsAndVisibleCells, 100);
    }
  }, [playerPosition, centerViewport, updateIndicatorsAndVisibleCells]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let animationFrameId: number | null = null;
    const handleScroll = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateIndicatorsAndVisibleCells);
    };

    updateIndicatorsAndVisibleCells();
    viewport.addEventListener('scroll', handleScroll);
    
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [updateIndicatorsAndVisibleCells]);

  const renderVirtualizedCells = () => {
    if (!visibleRange) return null;

    const cells = [];
    for (let y = visibleRange.rowStart; y <= visibleRange.rowEnd; y++) {
      for (let x = visibleRange.colStart; x <= visibleRange.colEnd; x++) {
        const isEntrance = x === ENTRANCE_X && y === ENTRANCE_Y;
        const isPlayerOnCell = playerPosition && playerPosition.x === x && playerPosition.y === y;
        
        const pathIndex = path?.findIndex(p => p.x === x && p.y === y) ?? -1;
        const isPath = pathIndex !== -1;
        const isAffordablePath = isPath && pathIndex > 0 && pathIndex <= currentEnergy;
        const isUnaffordablePath = isPath && pathIndex > 0 && pathIndex > currentEnergy;

        const isTarget = path && path.length > 1 && path[path.length - 1].x === x && path[path.length - 1].y === y;
        const energyCost = path ? path.length - 1 : 0;
        const canAffordMove = energyCost <= currentEnergy;

        const canClickEntrance = isEntrance && playerPosition && (
          isPlayerOnCell || 
          (Math.abs(playerPosition.x - ENTRANCE_X) + Math.abs(playerPosition.y - ENTRANCE_Y) === 1)
        );
        
        const isClickable = (isTarget && canAffordMove) || canClickEntrance;

        cells.push(
          <button
            key={`${x}-${y}`}
            onMouseEnter={() => onCellHover(x, y)}
            onClick={() => isClickable && onCellClick(x, y)}
            className={cn(
              "absolute flex items-center justify-center rounded-lg border transition-all duration-100",
              isEntrance ? "bg-white/20 border-white/30" : "bg-white/10 border-white/20",
              isAffordablePath && "bg-sky-400/30 border-sky-400/50",
              isUnaffordablePath && "bg-amber-500/30 border-amber-500/50",
              isTarget && canAffordMove && "bg-sky-400/40 border-sky-400/60 ring-2 ring-sky-400/80",
              isTarget && !canAffordMove && "bg-amber-500/40 border-amber-500/60 ring-2 ring-amber-500/80",
              isClickable ? "cursor-pointer" : "cursor-default",
              canClickEntrance && "hover:bg-white/30"
            )}
            style={{
              left: x * (CELL_SIZE_PX + CELL_GAP),
              top: y * (CELL_SIZE_PX + CELL_GAP),
              width: CELL_SIZE_PX,
              height: CELL_SIZE_PX,
            }}
          >
            {isEntrance && !isPlayerOnCell && (
              <div className="absolute inset-0 flex items-center justify-center">
                <ArrowDown className="w-6 h-6 text-white animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
            )}
            {isPlayerOnCell && (
              <div className="relative w-1/2 h-1/2 rounded-full bg-sky-400 shadow-lg"></div>
            )}
            {isAffordablePath && !isPlayerOnCell && !isEntrance && !isTarget && (
              <div className="w-1.5 h-1.5 rounded-full bg-sky-300/70"></div>
            )}
            {isUnaffordablePath && !isPlayerOnCell && !isEntrance && !isTarget && (
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70"></div>
            )}
            {isTarget && energyCost > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className={cn(
                  "flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm border border-white/20 rounded-full px-2 py-0.5 text-xs font-bold",
                  canAffordMove ? "text-white" : "text-red-400"
                )}>
                  <Zap size={12} />
                  <span>{energyCost}</span>
                </div>
              </div>
            )}
          </button>
        );
      }
    }
    return cells;
  };

  return (
    <div className="relative w-full h-full" onMouseLeave={() => onCellHover(-1, -1)}>
      <div
        ref={viewportRef}
        className="w-full h-full overflow-auto no-scrollbar"
      >
        <div
          className="relative"
          style={{
            width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
            height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
          }}
        >
          {renderVirtualizedCells()}
        </div>
      </div>
      {/* Indicateur de sortie */}
      <div
        className="absolute z-20 text-white transition-opacity pointer-events-none"
        style={{
          opacity: exitIndicator.visible ? 1 : 0,
          top: `${exitIndicator.y}px`,
          left: `${exitIndicator.x}px`,
          transform: `translate(-50%, -50%) rotate(${exitIndicator.angle}deg) translate(${ORBIT_RADIUS_PX}px)`,
        }}
      >
        <ArrowRight className="w-6 h-6" />
      </div>
      {/* Indicateur de joueur */}
      <div
        className="absolute z-20 text-white transition-opacity pointer-events-none"
        style={{
          opacity: playerIndicator.visible ? 1 : 0,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${playerIndicator.angle}deg) translate(clamp(40px, calc(min(25vh, 25vw) - 20px), 150px))`,
        }}
      >
        <ArrowRight className="w-6 h-6" />
      </div>
    </div>
  );
};

export default ExplorationGrid;