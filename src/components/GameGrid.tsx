import { usePlayerState } from "@/hooks/usePlayerState";
import { useMapLayout } from "@/hooks/useMapLayout";
import { useBasePosition } from "@/hooks/useBasePosition";
import { Tent, TreePine, Mountain, Waves, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  Foret: TreePine,
  Montagne: Mountain,
  Plaine: () => null,
  Eau: Waves,
  "Zone Contaminee": Skull,
};

export function GameGrid() {
  const { playerState, move, explore } = usePlayerState();
  const { mapLayout, isLoading, error } = useMapLayout();
  const { basePosition } = useBasePosition();

  if (isLoading) return <div>Chargement de la carte...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  const gridSize = Math.sqrt(mapLayout?.length || 0);

  const getZone = (x: number, y: number) => {
    return mapLayout?.find((zone) => zone.x === x && zone.y === y);
  };

  const isDiscovered = (x: number, y: number) => {
    const zone = getZone(x, y);
    return zone && playerState?.zones_decouvertes.includes(zone.id);
  };

  const isPlayerPosition = (x: number, y: number) => {
    const zone = getZone(x, y);
    return zone?.id === playerState?.current_zone_id;
  };

  const handleCellClick = (x: number, y: number) => {
    const zone = getZone(x, y);
    if (!zone) return;

    if (isDiscovered(x, y)) {
      move(zone.id);
    } else {
      explore(zone.id);
    }
  };

  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: gridSize * gridSize }, (_, i) => {
        const x = (i % gridSize) + 1;
        const y = Math.floor(i / gridSize) + 1;
        const zone = getZone(x, y);
        const discovered = isDiscovered(x, y);
        const Icon = zone ? ICONS[zone.type as keyof typeof ICONS] : null;

        return (
          <button
            key={i}
            onClick={() => handleCellClick(x, y)}
            className={cn(
              "relative h-16 w-16 border flex items-center justify-center",
              {
                "bg-gray-800": !discovered,
                "bg-green-200": discovered && zone?.type === "Plaine",
                "bg-green-800 text-white": discovered && zone?.type === "Foret",
                "bg-gray-500": discovered && zone?.type === "Montagne",
                "bg-blue-300": discovered && zone?.type === "Eau",
                "bg-yellow-500": discovered && zone?.type === "Zone Contaminee",
                "ring-2 ring-red-500 ring-inset": isPlayerPosition(x, y),
              }
            )}
            disabled={!zone}
          >
            {discovered && Icon && <Icon className="h-8 w-8" />}
            {basePosition && basePosition.x === x && basePosition.y === y && (
              <Tent className="absolute top-1 left-1 h-4 w-4 text-indigo-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}