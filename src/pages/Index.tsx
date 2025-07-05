import React, { useState, useEffect, useCallback } from 'react';
import GameGrid from '../components/GameGrid';
import PlayerStats from '../components/PlayerStats';
import Inventory from '../components/Inventory';
import EventLog from '../components/EventLog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { generateGrid, BiomeName } from '@/lib/grid';
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface GameState {
  id: string;
  user_id: string;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  grille_decouverte: boolean[][];
  inventaire: { item: string; quantite: number }[];
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

const Index = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [grid, setGrid] = useState<{ biome: BiomeName }[][]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGameState = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('game_states')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching game state:', error);
        toast({ title: "Erreur", description: "Impossible de charger l'état du jeu." });
      } else if (data) {
        setGameState(data);
        setGrid(generateGrid());
      } else {
        // No game state, create one
        const { data: newGameState, error: createError } = await supabase
          .from('game_states')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating game state:', createError);
        } else {
          setGameState(newGameState);
          setGrid(generateGrid());
        }
      }
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  const handleCellClick = (y: number, x: number) => {
    if (!gameState) return;
    
    const distance = Math.abs(y - gameState.position_y) + Math.abs(x - gameState.position_x);
    if (distance === 1 && gameState.energie > 0) {
      const newDiscoveredGrid = gameState.grille_decouverte.map(row => [...row]);
      newDiscoveredGrid[y][x] = true;

      const newGameState = {
        ...gameState,
        position_y: y,
        position_x: x,
        energie: gameState.energie - 10,
        grille_decouverte: newDiscoveredGrid,
      };
      setGameState(newGameState);
      addLog(`Vous vous déplacez en (${y}, ${x}).`);
    } else if (gameState.energie <= 0) {
      addLog("Vous êtes trop fatigué pour bouger.");
    } else {
      addLog("Cette case est trop loin.");
    }
  };

  const handleEndTurn = async () => {
    if (!gameState) return;

    let newVie = gameState.vie;
    let newFaim = gameState.faim - 10;
    let newSoif = gameState.soif - 15;
    let newEnergie = 100; // Restore energy
    let newJours = gameState.jours_survecus + 1;

    if (newFaim < 0) { newVie += newFaim; newFaim = 0; }
    if (newSoif < 0) { newVie += newSoif; newSoif = 0; }
    if (newVie < 0) newVie = 0;

    const updatedGameState = {
      ...gameState,
      vie: newVie,
      faim: newFaim,
      soif: newSoif,
      energie: newEnergie,
      jours_survecus: newJours,
    };

    setGameState(updatedGameState);
    addLog(`Jour ${newJours} terminé. Vous vous reposez.`);

    const { error } = await supabase
      .from('game_states')
      .update(updatedGameState)
      .eq('id', gameState.id);

    if (error) {
      console.error('Error updating game state:', error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder la progression." });
    }

    if (newVie <= 0) {
      toast({
        title: "Game Over",
        description: `Vous avez survécu ${gameState.jours_survecus} jours.`,
        action: <ToastAction altText="Recommencer" onClick={() => window.location.reload()}>Recommencer</ToastAction>,
      });
      addLog("Vous n'avez pas survécu...");
    }
  };

  const addLog = (message: string) => {
    setLogs(prevLogs => [message, ...prevLogs].slice(0, 10));
  };

  if (loading || !gameState) {
    return <div className="flex items-center justify-center h-screen">Chargement de la partie...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 gap-4">
      <div className="md:w-1/4 flex flex-col gap-4">
        <PlayerStats stats={gameState} />
        <Inventory inventory={gameState.inventaire} />
      </div>
      <main className="flex-1 flex flex-col items-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <GameGrid 
          grid={grid} 
          playerPosition={{x: gameState.position_x, y: gameState.position_y}}
          onCellClick={handleCellClick}
          discoveredGrid={gameState.grille_decouverte}
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={handleEndTurn}>Terminer le tour</Button>
        </div>
      </main>
      <div className="md:w-1/4">
        <EventLog logs={logs} />
      </div>
    </div>
  );
};

export default Index;