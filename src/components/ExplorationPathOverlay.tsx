import { useMemo } from 'react';
import { cn } from "@/lib/utils";

const CELL_SIZE_PX = 40;
const CELL_GAP = 4;
const CELL_TOTAL_SIZE = CELL_SIZE_PX + CELL_GAP;

interface ExplorationPathOverlayProps {
  path: { x: number; y: number }[] | null;
  currentEnergy: number;
}

const generateSvgPath = (path: { x: number; y: number }[]): string => {
  if (path.length < 2) return "";
  
  const firstPoint = path[0];
  const pathString = path
    .slice(1)
    .map(p => `L ${p.x * CELL_TOTAL_SIZE + CELL_SIZE_PX / 2} ${p.y * CELL_TOTAL_SIZE + CELL_SIZE_PX / 2}`)
    .join(' ');

  return `M ${firstPoint.x * CELL_TOTAL_SIZE + CELL_SIZE_PX / 2} ${firstPoint.y * CELL_TOTAL_SIZE + CELL_SIZE_PX / 2} ${pathString}`;
};

const ExplorationPathOverlay = ({ path, currentEnergy }: ExplorationPathOverlayProps) => {
  const svgPathString = useMemo(() => {
    if (!path) return "";
    return generateSvgPath(path);
  }, [path]);

  if (!path || path.length < 2) {
    return null;
  }

  const cost = path.length - 1;
  const canAfford = cost <= currentEnergy;

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      style={{
        width: `${51 * CELL_TOTAL_SIZE}px`,
        height: `${51 * CELL_TOTAL_SIZE}px`,
      }}
    >
      <path
        d={svgPathString}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "transition-colors",
          canAfford ? "stroke-sky-400/80" : "stroke-amber-500/80"
        )}
      />
    </svg>
  );
};

export default ExplorationPathOverlay;