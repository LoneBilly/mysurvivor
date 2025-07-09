import { useState, useEffect } from "react";
import GameInterface from "@/components/GameInterface";
import { useGameState } from "@/hooks/useGameState";
import { supabase } from "@/integrations/supabase/client";
import { MapCell, GameState } from "@/types/game";
import { showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { gameState, loading: gameStateLoading, saveGameState } = useGameState();
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    const fetchMapLayout = async () => {
      const { data, error } = await supabase.from('map_layout').select('*').order('y').order('x');
      if (error) {
        console.error("Error fetching map layout:", error);
        showError("Impossible de charger la carte.");
      } else {
        setMapLayout(data as MapCell[]);
      }
      setMapLoading(false);
    };
    
    fetchMapLayout();
  }, []);

  const isLoading = gameStateLoading || mapLoading;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center text-black">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
          <p className="text-gray-600">Chargement de votre aventure...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Erreur lors du chargement des données du joueur.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-black text-white rounded-none"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  return (
    <GameInterface
      gameState={gameState}
      mapLayout={mapLayout}
      saveGameState={saveGameState}
    />
  );
};

export default Index;