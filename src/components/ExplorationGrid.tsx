import React, { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Zone } from '@/types';
import GridCell from './GridCell';

interface ExplorationGridProps {
  zones: Zone[];
  playerPosition: { x: number; y: number } | null;
  basePosition: { x: number; y: number } | null;
  explorationTarget: { x: number; y: number } | null;
  discoveredZones: number[];
  onZoneClick: (zone: Zone) => void;
  gridSize: { width: number; height: number };
  cellSize?: number;
}

const ExplorationGrid: React.FC<ExplorationGridProps> = ({
  zones,
  playerPosition,
  basePosition,
  explorationTarget,
  discoveredZones,
  onZoneClick,
  gridSize,
  cellSize = 80,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);

  const { width: gridWidth, height: gridHeight } = gridSize;

  const rowVirtualizer = useVirtualizer({
    count: gridHeight,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => cellSize,
    overscan: 5,
  });

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: gridWidth,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => cellSize,
    overscan: 5,
  });

  const zonesMap = useMemo(() => {
    const map = new Map<string, Zone>();
    zones.forEach(zone => {
      map.set(`${zone.x},${zone.y}`, zone);
    });
    return map;
  }, [zones]);

  const discoveredSet = useMemo(() => new Set(discoveredZones), [discoveredZones]);

  const handleZoneClick = useCallback((zone: Zone) => {
    onZoneClick(zone);
  }, [onZoneClick]);

  return (
    <div ref={viewportRef} className="w-full h-full overflow-auto no-scrollbar cursor-grab active:cursor-grabbing">
      <div
        className="relative"
        style={{
          width: `${colVirtualizer.getTotalSize()}px`,
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          colVirtualizer.getVirtualItems().map(virtualColumn => {
            const y = virtualRow.index;
            const x = virtualColumn.index;
            const zone = zonesMap.get(`${x},${y}`);
            
            const isPlayerHere = playerPosition?.x === x && playerPosition?.y === y;
            const isBaseHere = basePosition?.x === x && basePosition?.y === y;
            const isExplorationTarget = explorationTarget?.x === x && explorationTarget?.y === y;
            const isDiscovered = zone ? discoveredSet.has(zone.id) : false;

            return (
              <GridCell
                key={`${x}-${y}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${virtualColumn.size}px`,
                  height: `${virtualRow.size}px`,
                  transform: `translateX(${virtualColumn.start}px) translateY(${virtualRow.start}px)`,
                }}
                zone={zone}
                isPlayerHere={isPlayerHere}
                isBaseHere={isBaseHere}
                isExplorationTarget={isExplorationTarget}
                isDiscovered={isDiscovered}
                onZoneClick={handleZoneClick}
              />
            );
          })
        ))}
      </div>
    </div>
  );
};

export default ExplorationGrid;