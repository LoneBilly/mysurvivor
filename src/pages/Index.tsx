import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import GameGrid from '@/components/GameGrid';
import PlayerStats from '@/components/PlayerStats';
import GameHeader from '@/components/GameHeader';
import InventoryModal from '@/components/InventoryModal';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      await loadGameState(user.id);
    } catch (error) {
      console.error('Error checking user:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données utilisateur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGameState = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('game_states')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setGameState(data);
    } catch (error) {
      console.error('Error loading game state:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'état du jeu",
        variant: "destructive",
      });
    }
  };

  const updateGameState = async (updates) => {
    if (!user || !gameState) return;

    try {
      const { error } = await supabase
        .from('game_states')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setGameState(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating game state:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les changements",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center">
        <div className="text-white">Erreur de chargement</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 flex flex-col">
      <GameHeader 
        daysSurvived={gameState.jours_survecus}
        onLeaderboardClick={() => navigate('/leaderboard')}
        onOptionsClick={() => {/* TODO: Options */}}
      />
      
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 bg-gray-400 p-4">
          <GameGrid 
            gameState={gameState}
            onUpdateGameState={updateGameState}
          />
        </div>
        
        <div className="w-full lg:w-80 bg-slate-800 p-4 space-y-4">
          <PlayerStats 
            vie={gameState.vie}
            faim={gameState.faim}
            soif={gameState.soif}
            energie={gameState.energie}
          />
          
          <button
            onClick={() => setShowInventory(true)}
            className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Inventaire
          </button>
        </div>
      </div>

      <InventoryModal 
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
        inventory={gameState.inventaire || []}
      />
    </div>
  );
};

export default Index;