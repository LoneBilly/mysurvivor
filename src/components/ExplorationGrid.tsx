import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, Zap } from "lucide-react";
import { useVirtualizer } from '@tanstack/react-virtual';

const GRID_SIZE = 51;
const CELL_SIZE_PX = 40;
const CELL_GAP = 4;
const CELL_TOTAL_SIZE = CELL_SIZE_PX + CELL_GAP;
const ENTRANCE_X = 25;
const ENTRANCE_Y = 50;
const ORBIT_RADIUS_PX = 40;

const findPathBFS = (start: {x: number, y: number}, end: {x: number, y: number}): {x: number, y: number}[] | null => {
    const queue: {pos: {x: number, y: number}, path: {x: number, y: number}[]}[] = [{pos: start, path: [start]}];
    const visited = new Set<string>([`${start.x},${start.y}`]);

    while (queue.length > 0) {
        const { pos, path } = queue.shift()!;

        if (pos.x === end.x && pos.y === end.y) {
            return path;
        }

        const neighbors = [
            { x: pos.x + 1, y: pos.y }, { x: pos.x - 1, y: pos.y },
            { x: pos.x, y: pos.y + 1 }, { x: pos.x, y: pos.y - 1 },
        ];

        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (
                neighbor.x >= 0 && neighbor.x < GRID_SIZE &&
                neighbor.y >= 0 && neighbor.y < GRID_SIZE &&
                !visited.has(key)
            ) {
                visited.add(key);
                const newPath = [...path, neighbor];
                queue.push({ pos: neighbor, path: newPath });
            }
        }
    }
    return null;
};

interface ExplorationGridProps {
  playerPosition: { x: number; y: number } | null;
  onCellClick: (x: number, y: number, path: {x: number, y: number}[] | null) => void;
  currentEnergy: number;
}

const ExplorationGrid = ({ playerPosition, onCellClick, currentEnergy }: ExplorationGridProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const exitIndicatorRef = useRef<HTMLDivElement>(null);
  const playerIndicatorRef = useRef<HTMLDivElement>(null);
  const hasCentered = useRef(false);
  const cellElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const lastPathRef = useRef<{ x: number; y: number }[] | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: GRID_SIZE,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => CELL_TOTAL_SIZE,
    overscan: 5,
  });

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: GRID_SIZE,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => CELL_TOTAL_SIZE,
    overscan: 5,
  });

  const centerViewport = useCallback((x: number, y: number, behavior: 'auto' | 'smooth' = 'auto') => {
    rowVirtualizer.scrollToIndex(y, { align: 'center', behavior });
    colVirtualizer.scrollToIndex(x, { align: 'center', behavior });
  }, [rowVirtualizer, colVirtualizer]);

  const drawPath = useCallback((path: { x: number; y: number }[] | null) => {
    const cells = cellElementsRef.current;

    if (lastPathRef.current) {
      for (const segment of lastPathRef.current) {
        const key = `${segment.x},${segment.y}`;
        const cell = cells.get(key);
        if (cell) {
          cell.classList.remove('path-affordable', 'path-unaffordable', 'path-target-affordable', 'path-target-unaffordable', 'transition-none');
          const costEl = cell.querySelector<HTMLElement>('.path-cost');
          if (costEl) costEl.classList.add('hidden');
          const dotEl = cell.querySelector<HTMLElement>('.path-dot');
          if (dotEl) dotEl.classList.add('hidden');
        }
      }
    }

    if (path && path.length > 1) {
      const energyCost = path.length - 1;
      const canAfford = energyCost <= currentEnergy;

      path.forEach((segment, index) => {
        if (index === 0) return;
        const key = `${segment.x},${segment.y}`;
        const cell = cells.get(key);
        if (cell) {
          const isTarget = index === path.length - 1;
          cell.classList.add('transition-none');

          if (isTarget) {
            cell.classList.add(canAfford ? 'path-target-affordable' : 'path-target-unaffordable');
            const costEl = cell.querySelector<HTMLElement>('.path-cost');
            const costSpan = cell.querySelector<HTMLElement>('.path-cost-value');
            if (costEl && costSpan) {
              costSpan.textContent = energyCost.toString();
              costEl.classList.toggle('text-red-400', !canAfford);
              costEl.classList.remove('hidden');
            }
          } else {
            cell.classList.add(canAfford ? 'path-affordable' : 'path-unaffordable');
            const dotEl = cell.querySelector<HTMLElement>('.path-dot');
            if (dotEl) {
              dotEl.classList.toggle('bg-sky-300/70', canAfford);
              dotEl.classList.toggle('bg-amber-400/70', !canAfford);
              dotEl.classList.remove('hidden');
            }
          }
        }
      });
    }
    lastPathRef.current = path;
  }, [currentEnergy]);

  const handleCellHover = (x: number, y: number) => {
    if (!playerPosition || (x === -1 && y === -1)) {
      drawPath(null);
      return;
    }
    const path = findPathBFS(playerPosition, { x, y });
    drawPath(path);
  };

  const updateIndicators = useCallback(() => {
    const viewport = viewportRef.current;
    const exitIndicatorEl = exitIndicatorRef.current;
    const playerIndicatorEl = playerIndicatorRef.current;

    if (!viewport || !playerPosition || !exitIndicatorEl || !playerIndicatorEl) {
      return;
    }

    const { scrollLeft, scrollTop, clientWidth, clientHeight } = viewport;

    const playerPixelX = playerPosition.x * CELL_TOTAL_SIZE + CELL_SIZE_PX / 2;
    const playerPixelY = playerPosition.y * CELL_TOTAL_SIZE + CELL_SIZE_PX / 2;

    // Exit Indicator Logic
    const exitPixelX = ENTRANCE_X * CELL_TOTAL_SIZE + CELL_SIZE_PX / 2;
    const exitPixelY = ENTRANCE_Y * CELL_TOTAL_SIZE + CELL_SIZE_PX / 2;
    const isExitVisible = exitPixelX >= scrollLeft && exitPixelX <= scrollLeft + clientWidth && exitPixelY >= scrollTop && exitPixelY <= scrollTop + clientHeight;

    if (isExitVisible) {
      exitIndicatorEl.style.opacity = '0';
    } else {
      const playerScreenX = playerPixelX - scrollLeft;
      const playerScreenY = playerPixelY - scrollTop;
      const dx = exitPixelX - playerPixelX;
      const dy = exitPixelY - playerPixelY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      exitIndicatorEl.style.opacity = '1';
      exitIndicatorEl.style.top = `${playerScreenY}px`;
      exitIndicatorEl.style.left = `${playerScreenX}px`;
      exitIndicatorEl.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(${ORBIT_RADIUS_PX}px)`;
    }

    // Player Indicator Logic
    const isPlayerVisible = playerPixelX >= scrollLeft && playerPixelX <= scrollLeft + clientWidth && playerPixelY >= scrollTop && playerPixelY <= scrollTop + clientHeight;

    if (isPlayerVisible) {
      playerIndicatorEl.style.opacity = '0';
    } else {
      const viewportCenterX = scrollLeft + clientWidth / 2;
      const viewportCenterY = scrollTop + clientHeight / 2;
      const dx = playerPixelX - viewportCenterX;
      const dy = playerPixelY - viewportCenterY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      playerIndicatorEl.style.opacity = '1';
      playerIndicatorEl.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(clamp(40px, calc(min(25vh, 25vw) - 20px), 150px))`;
    }
  }, [playerPosition]);

  useLayoutEffect(() => {
    if (playerPosition && !hasCentered.current) {
      centerViewport(playerPosition.x, playerPosition.y, 'auto');
      hasCentered.current = true;
      setTimeout(updateIndicators, 100);
    }
  }, [playerPosition, centerViewport, updateIndicators]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener('scroll', updateIndicators, { passive: true });
    return () => viewport.removeEventListener('scroll', updateIndicators);
  }, [updateIndicators]);

  return (
    <div className="relative w-full h-full" onMouseLeave={() => handleCellHover(-1, -1)}>
      <div ref={viewportRef} className="w-full h-full overflow-auto no-scrollbar">
        <div className="relative" style={{ width: `${colVirtualizer.getTotalSize()}px`, height: `${rowVirtualizer.getTotalSize()}px` }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => (
            colVirtualizer.getVirtualItems().map(virtualColumn => {
              const y = virtualRow.index;
              const x = virtualColumn.index;
              const key = `${x},${y}`;
              const isEntrance = x === ENTRANCE_X && y === ENTRANCE_Y;
              const isPlayerOnCell = playerPosition && playerPosition.x === x && playerPosition.y === y;
              const canClickEntrance = isEntrance && playerPosition && (isPlayerOnCell || (Math.abs(playerPosition.x - ENTRANCE_X) + Math.abs(playerPosition.y - ENTRANCE_Y) === 1));

              return (
                <button
                  key={key}
                  ref={el => { if (el) cellElementsRef.current.set(key, el); else cellElementsRef.current.delete(key); }}
                  onMouseEnter={() => handleCellHover(x, y)}
                  onClick={() => onCellClick(x, y, lastPathRef.current)}
                  className={cn(
                    "absolute flex items-center justify-center rounded-lg border",
                    isEntrance ? "bg-white/20 border-white/30" : "bg-white/10 border-white/20",
                    canClickEntrance ? "cursor-pointer hover:bg-white/30" : "cursor-default"
                  )}
                  style={{
                    left: 0, top: 0, width: `${CELL_SIZE_PX}px`, height: `${CELL_SIZE_PX}px`,
                    transform: `translateX(${virtualColumn.start}px) translateY(${virtualRow.start}px)`,
                  }}
                >
                  {isEntrance && !isPlayerOnCell && <ArrowDown className="w-6 h-6 text-white animate-bounce" style={{ animationDuration: '2s' }} />}
                  {isPlayerOnCell && <div className="relative w-1/2 h-1/2 rounded-full bg-sky-400 shadow-lg"></div>}
                  <div className="path-dot w-1.5 h-1.5 rounded-full hidden"></div>
                  <div className="path-cost absolute -top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden">
                    <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm border border-white/20 rounded-full px-2 py-0.5 text-xs font-bold text-white">
                      <Zap size={12} />
                      <span className="path-cost-value"></span>
                    </div>
                  </div>
                </button>
              );
            })
          ))}
        </div>
      </div>
      <div
        ref={exitIndicatorRef}
        className="absolute z-20 text-white transition-opacity pointer-events-none"
        style={{ opacity: 0 }}
      >
        <ArrowRight className="w-6 h-6" />
      </div>
      <div
        ref={playerIndicatorRef}
        className="absolute z-20 text-white transition-opacity pointer-events-none"
        style={{ opacity: 0, top: '50%', left: '50%' }}
      >
        <ArrowRight className="w-6 h-6" />
      </div>
    </div>
  );
};

export default ExplorationGrid;