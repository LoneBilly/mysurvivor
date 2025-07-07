import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapCell } from "@/types/game";
import { Loader2, Tent, Lock } from "lucide-react";
import ZoneIcon from "./ZoneIcon";

interface GameGridProps {
  onCellSelect: (cell: MapCell) => void;
  discoveredZones: number[];
  playerPosition: { x: number; y: number };
  basePosition: { x: number; y: number } | null;
}

const GameGrid = ({ onCellSelect, discoveredZones, playerPosition, basePosition }: GameGridProps) => {
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMapLayout = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('map_layout').select('*').order('y').order('x');
      if (error) {
        console.error("Error fetching map layout:", error);
      } else {
        setMapLayout(data as MapCell[]);
      }
      setLoading(false);
    };
    fetchMapLayout();
  }, []);

  const generateGrid = (): (MapCell & { discovered: boolean })[][] => {
    const grid: (MapCell & { discovered: boolean })[][] = Array(7).fill(null).map(() => []);
    if (!mapLayout.length) return grid;

    const discoveredSet = new Set(discoveredZones);

    mapLayout.forEach(cell => {
      if (!grid[cell.y]) grid[cell.y] = [];
      grid[cell.y][cell.x] = {
        ...cell,
        discovered: discoveredSet.has(cell.id),
      };
    });
    return grid;
  };

  const grid = generateGrid();

  const getCellContent = (cell: MapCell & { discovered: boolean }) => {
    if (!cell || cell.type === 'unknown') return null;
    if (!cell.discovered) return <Lock className="w-6 h-6" />;
    return <ZoneIcon type={cell.type} className="w-7 h-7" />;
  };

  const getCellStyle = (cell: MapCell & { discovered: boolean }, isPlayerCell: boolean) => {
    const baseStyles = "relative aspect-square flex items-center justify-center font-bold rounded-lg border-2 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50";

    if (!cell || cell.type === 'unknown') {
      return cn(baseStyles, "bg-black/50 border-gray-800 cursor-not-allowed");
    }

    let typeStyle = "";
    if (!cell.discovered) {
      typeStyle = "bg-gray-800/70 border-gray-700 hover:border-blue-500/50 text-gray-500 cursor-pointer focus:ring-blue-400";
    } else {
      switch (cell.type) {
        case 'foret':
          typeStyle = "bg-green-900/40 border-green-500/50 hover:bg-green-800/60 hover:border-green-400 text-green-300 focus:ring-green-400";
          break;
        case 'plage':
          typeStyle = "bg-yellow-900/40 border-yellow-500/50 hover:bg-yellow-800/60 hover:border-yellow-400 text-yellow-300 focus:ring-yellow-400";
          break;
        case 'Rivière':
          typeStyle = "bg-blue-900/40 border-blue-500/50 hover:bg-blue-800/60 hover:border-blue-400 text-blue-300 focus:ring-blue-400";
          break;
        case 'Mine':
        case 'Grotte':
          typeStyle = "bg-stone-800/40 border-stone-500/50 hover:bg-stone-700/60 hover:border-stone-400 text-stone-300 focus:ring-stone-400";
          break;
        case 'Parking souterrain':
        case 'Entrepôt portuaire':
        case 'Musée':
        case 'Zone industrielle':
        case 'Camp de survivants':
        case 'Hôpital':
        case 'Métro':
        case 'Ferme':
        case 'Station-service':
        case 'Base militaire':
        case 'Quartier résidentiel':
        case 'Bibliothèque':
        case 'Commissariat de police':
        case 'Bunker':
        case 'Pharmacie':
        case 'Église':
        case 'Magasin de vêtements':
        case 'Ruine':
        case 'Boite de nuit':
        case 'Usine désaffectée':
        case 'Banque':
        case 'Abattoir':
        case "Parc d'attraction":
        case 'Concession automobile':
        case 'Supermarché':
          typeStyle = "bg-slate-800/40 border-slate-500/50 hover:bg-slate-700/60 hover:border-slate-400 text-slate-300 focus:ring-slate-400";
          break;
        default:
          typeStyle = "bg-gray-800/40 border-gray-600/50 hover:bg-gray-700/60 hover:border-gray-500 text-gray-400 focus:ring-gray-400";
          break;
      }
      typeStyle = cn(typeStyle, "cursor-pointer");
    }
    
    return cn(
        baseStyles, 
        typeStyle, 
        isPlayerCell && "ring-4 ring-blue-400 ring-opacity-75 border-blue-400"
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 p-2 md:p-3 rounded-xl shadow-2xl border border-gray-700 h-full aspect-square flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 p-2 md:p-3 rounded-xl shadow-2xl border border-gray-700 h-full aspect-square flex items-center justify-center">
      <div className="grid grid-cols-7 gap-1.5 md:gap-2 w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) => {
            if (!cell) return <div key={`${x}-${y}`} className="aspect-square rounded-lg bg-black/50" />;
            const isPlayerCell = playerPosition.x === x && playerPosition.y === y;
            return (
              <button
                key={`${x}-${y}`}
                onClick={() => cell && cell.type !== 'unknown' && onCellSelect(cell)}
                disabled={!cell || cell.type === 'unknown'}
                className={getCellStyle(cell, isPlayerCell)}
              >
                {getCellContent(cell)}
                {basePosition && basePosition.x === x && basePosition.y === y && (
                  <Tent className="absolute top-1.5 left-1.5 h-4 w-4 text-amber-300 drop-shadow-lg" />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  );
};

export default GameGrid;