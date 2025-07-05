import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GameGrid } from '@/components/GameGrid';
import { StatsPanel } from '@/components/StatsPanel';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';

interface GameState {
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  grille_decouverte: boolean[][];
  position_x: number;
  position_y: number;
  jours_survecus: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    loadGameState();
  };

  const loadGameState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('game_states')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading game state:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'état du jeu",
          variant: "destructive",
        });
        return;
      }

      setGameState(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (x: number, y: number) => {
    if (!gameState) return;

    // Vérifier si la case est adjacente au joueur
    const dx = Math.abs(x - gameState.position_x);
    const dy = Math.abs(y - gameState.position_y);
    
    if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
      toast({
        title: "Mouvement impossible",
        description: "Vous ne pouvez vous déplacer que sur les cases adjacentes",
        variant: "destructive",
      });
      return;
    }

    // Coût en énergie pour se déplacer
    const energyCost = 5;
    if (gameState.energie < energyCost) {
      toast({
        title: "Pas assez d'énergie",
        description: "Vous n'avez pas assez d'énergie pour vous déplacer",
        variant: "destructive",
      });
      return;
    }

    // Mettre à jour la grille découverte
    const newGrid = [...gameState.grille_decouverte];
    newGrid[y][x] = true;

    // Mettre à jour l'état du jeu
    const newGameState = {
      ...gameState,
      position_x: x,
      position_y: y,
      energie: gameState.energie - energyCost,
      grille_decouverte: newGrid,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('game_states')
        .update({
          position_x: x,
          position_y: y,
          energie: newGameState.energie,
          grille_decouverte: newGrid,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating game state:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder le mouvement",
          variant: "destructive",
        });
        return;
      }

      setGameState(newGameState);
      toast({
        title: "Déplacement réussi",
        description: `Vous vous êtes déplacé en (${x}, ${y})`,
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Erreur de chargement du jeu</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      
      <main className="flex-1 flex flex-col p-2.5" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-6xl mx-auto w-full">
          {/* Panneau des statistiques */}
          <div className="lg:w-80 flex-shrink-0">
            <StatsPanel
              vie={gameState.vie}
              faim={gameState.faim}
              soif={gameState.soif}
              energie={gameState.energie}
              jours={gameState.jours_survecus}
            />
          </div>
          
          {/* Grille de jeu */}
          <div className="flex-1 flex items-center justify-center">
            <GameGrid
              grid={gameState.grille_decouverte}
              playerPosition={{ x: gameState.position_x, y: gameState.position_y }}
              onCellClick={handleCellClick}
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;