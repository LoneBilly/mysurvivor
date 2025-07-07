import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapCell } from "@/types/game";
import { 
  Loader2, Tent, TreePine, Waves, Pickaxe, Mountain, Factory, Hospital, Shield, Home, ShoppingCart, 
  Building2, Car, Church, Library, PiggyBank, RollerCoaster, Scissors, Skull, Syringe, 
  Warehouse, TramFront, Wheat, Fuel, Music, Landmark 
} from "lucide-react";

interface GameGridProps {
  onCellSelect: (cell: MapCell) => void;
  discoveredZones: number[];
  playerPosition: { x: number; y: number };
  basePosition: { x: number; y: number } | null;
}

const iconMap: { [key: string]: React.ElementType } = {
  'foret': TreePine,
  'plage': Waves,
  'Rivière': Waves,
  'Mine': Pickaxe,
  'Grotte': Mountain,
  'Zone industrielle': Factory,
  'Hôpital': Hospital,
  'Base militaire': Shield,
  'Quartier résidentiel': Home,
  'Supermarché': ShoppingCart,
  'Camp de survivants': Tent,
  'Parking souterrain': Car,
  'Entrepôt portuaire': Warehouse,
  'Musée': Landmark,
  'Métro': TramFront,
  'Ferme': Wheat,
  'Station-service': Fuel,
  'Bibliothèque': Library,
  'Commissariat de police': Shield,
  'Bunker': Shield,
  'Pharmacie': Syringe,
  'Église': Church,
  'Magasin de vêtements': Scissors,
  'Ruine': Skull,
  'Boite de nuit': Music,
  'Usine désaffectée': Factory,
  'Banque': PiggyBank,
  'Abattoir': Skull,
  "Parc d'attraction": RollerCoaster,
  'Concession automobile': Car,
  'default': Building2,
};

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
    if (!cell || cell.type === 'unknown') return null;
    if (!cell.discovered) return <span className="text-3xl font-light text-gray-400">?</span>;
    
    const Icon = iconMap[cell.type] || iconMap['default'];
    return <Icon className="w-1/2 h-1/2" />;
  };

  const getCellStyle = (cell: MapCell & { discovered: boolean }) => {
    if (!cell || cell.type === 'unknown') {
      return "bg-black/50 border-transparent cursor-default";
    }

    if (!cell.discovered) {
      return "bg-gray-800/80 border-gray-700/50 text-gray-400 hover:border-sky-500 hover:bg-gray-800 cursor-pointer";
    }
    
    let typeStyle;

    switch (cell.type) {
      case 'foret':
        typeStyle = "border-green-700/50 text-green-300 bg-green-900/30 hover:bg-green-900/60";
        break;
      case 'plage':
        typeStyle = "border-yellow-700/50 text-yellow-300 bg-yellow-900/30 hover:bg-yellow-900/60";
        break;
      case 'Rivière':
        typeStyle = "border-blue-700/50 text-blue-300 bg-blue-900/30 hover:bg-blue-900/60";
        break;
      case 'Mine':
      case 'Grotte':
        typeStyle = "border-stone-600/50 text-stone-300 bg-stone-800/30 hover:bg-stone-800/60";
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
        typeStyle = "border-slate-600/50 text-slate-300 bg-slate-800/30 hover:bg-slate-800/60";
        break;

      default:
        typeStyle = "border-gray-500/50 text-gray-300 bg-gray-900/30 hover:bg-gray-900/60";
    }
    return cn(typeStyle, "cursor-pointer");
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 p-2 md:p-3 rounded-xl shadow-2xl h-full aspect-square flex items-center justify-center border border-gray-700/50 bg-[radial-gradient(theme(colors.gray.800)_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="grid grid-cols-7 gap-1 md:gap-1.5 w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => cell && cell.type !== 'unknown' && onCellSelect(cell)}
              disabled={!cell || cell.type === 'unknown'}
              className={cn(
                "relative aspect-square flex items-center justify-center font-bold rounded-md border-2 transition-all duration-200",
                getCellStyle(cell)
              )}
            >
              {getCellContent(cell)}
              {playerPosition.x === x && playerPosition.y === y && (
                <div className="absolute top-1 right-1 w-2 h-2">
                  <div className="w-full h-full rounded-full bg-blue-400 animate-ping absolute"></div>
                  <div className="w-full h-full rounded-full bg-blue-500 relative"></div>
                </div>
              )}
              {basePosition && basePosition.x === x && basePosition.y === y && (
                <div className="absolute inset-0 border-2 border-amber-400 rounded-md pointer-events-none">
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default GameGrid;