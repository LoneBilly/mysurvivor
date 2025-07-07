import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapCell } from "@/types/game";
import { Loader2, Home } from "lucide-react";

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
        setLoading(false);
      } else {
        setMapLayout(data as MapCell[]);
        setLoading(false);
      }
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
    if (!cell) return "?";
    if (!cell.discovered) return "?";
    
    switch (cell.type) {
      case 'foret': return "🌲";
      case 'plage': return "🏖️";
      case 'Parking souterrain': return "🅿️";
      case 'Entrepôt portuaire': return "⚓";
      case 'Musée': return "🏛️";
      case 'Zone industrielle': return "🏭";
      case 'Camp de survivants': return "🏕️";
      case 'Mine': return "⛏️";
      case 'Hôpital': return "🏥";
      case 'Métro': return "🚇";
      case 'Grotte': return "🦇";
      case 'Ferme': return "🚜";
      case 'Station-service': return "⛽";
      case 'Base militaire': return "🎖️";
      case 'Quartier résidentiel': return "🏘️";
      case 'Bibliothèque': return "📚";
      case 'Commissariat de police': return "🚓";
      case 'Bunker': return "🛡️";
      case 'Pharmacie': return "💊";
      case 'Rivière': return "💧";
      case 'Église': return "⛪";
      case 'Magasin de vêtements': return "👕";
      case 'Ruine': return "🏚️";
      case 'Boite de nuit': return "💃";
      case 'Usine désaffectée': return "🏭";
      case 'Banque': return "🏦";
      case 'Abattoir': return "🔪";
      case "Parc d'attraction": return "🎡";
      case 'Concession automobile': return "🚗";
      case 'Supermarché': return "🛒";
      default:
        return "?";
    }
  };

  const getCellStyle = (cell: MapCell & { discovered: boolean }) => {
    if (!cell) return "bg-gray-400";

    if (!cell.discovered) {
      return "bg-gray-400 hover:bg-gray-300 text-gray-700 cursor-pointer border-gray-500";
    }
    
    const urbanStyle = "bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer border-slate-400";
    
    switch (cell.type) {
      case 'foret':
        return "bg-green-200 hover:bg-green-300 text-green-800 cursor-pointer border-green-400";
      case 'plage':
        return "bg-yellow-200 hover:bg-yellow-300 text-yellow-800 cursor-pointer border-yellow-400";
      case 'Rivière':
        return "bg-blue-200 hover:bg-blue-300 text-blue-800 cursor-pointer border-blue-400";
      case 'Mine':
      case 'Grotte':
        return "bg-stone-300 hover:bg-stone-400 text-stone-800 cursor-pointer border-stone-500";
      
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
        return urbanStyle;

      default:
        return "bg-gray-400 hover:bg-gray-300 text-gray-700 cursor-pointer border-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
      <div className="grid grid-cols-7 gap-1 md:gap-2 w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => cell && onCellSelect(cell)}
              className={cn(
                "relative aspect-square flex items-center justify-center text-lg md:text-xl font-bold rounded border-2 transition-colors",
                getCellStyle(cell)
              )}
            >
              {getCellContent(cell)}
              {playerPosition.x === x && playerPosition.y === y && (
                <>
                  <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 animate-ping"></div>
                  <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500"></div>
                </>
              )}
              {basePosition && basePosition.x === x && basePosition.y === y && (
                <Home className="absolute bottom-1 left-1 h-4 w-4 text-indigo-600" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default GameGrid;