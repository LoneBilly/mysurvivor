import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import GameStats from '@/components/GameStats';
import MapGrid from '@/components/MapGrid';
import ActionModal from '@/components/ActionModal';
import BaseView from '@/components/BaseView';
import { toast } from 'sonner';

interface GameState {
  id: string;
  user_id: string;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  grille_decouverte: boolean[][];
  inventaire: any[];
  position_x: number;
  position_y: number;
  base_position_x: number | null;
  base_position_y: number | null;
}

interface MapCell {
  x: number;
  y: number;
  type: string;
}

const Index = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [showBase, setShowBase] = useState(false);

  useEffect(() => {
    if (user) {
      loadGameData();
    }
  }, [user]);

  const loadGameData = async () => {
    try {
      // Charger l'état du jeu
      const { data: gameData, error: gameError } = await supabase
        .from('game_states')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (gameError && gameError.code !== 'PGRST116') {
        throw gameError;
      }

      if (gameData) {
        setGameState(gameData);
      }

      // Charger la carte
      const { data: mapData, error: mapError } = await supabase
        .from('map_layout')
        .select('*');

      if (mapError) throw mapError;
      setMapLayout(mapData || []);

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement du jeu');
    } finally {
      setLoading(false);
    }
  };

  const updateGameState = async (updates: Partial<GameState>) => {
    if (!gameState) return;

    try {
      const { error } = await supabase
        .from('game_states')
        .update(updates)
        .eq('id', gameState.id);

      if (error) throw error;

      setGameState(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleCellClick = (x: number, y: number) => {
    if (!gameState || !mapLayout) return;

    const cell = mapLayout.find(c => c.x === x && c.y === y);
    if (!cell) return;

    const isDiscovered = gameState.grille_decouverte[y]?.[x];
    if (!isDiscovered) return;

    const isAdjacent = Math.abs(gameState.position_x - x) <= 1 && 
                      Math.abs(gameState.position_y - y) <= 1;
    if (!isAdjacent) return;

    const actions = [];

    // Actions de base
    if (x !== gameState.position_x || y !== gameState.position_y) {
      actions.push({
        label: 'Se déplacer ici',
        onClick: () => handleMove(x, y)
      });
    }

    // Actions spécifiques selon le type de case
    switch (cell.type) {
      case 'foret':
        actions.push({
          label: 'Chercher du bois',
          onClick: () => handleGatherWood()
        });
        break;
      case 'riviere':
        actions.push({
          label: 'Boire de l\'eau',
          onClick: () => handleDrinkWater()
        });
        break;
      case 'plaine':
        // Vérifier si une base peut être installée
        if (!gameState.base_position_x && !gameState.base_position_y) {
          actions.push({
            label: 'Installer une base',
            onClick: () => handleInstallBase(x, y)
          });
        }
        break;
    }

    // Si on est sur la case de la base installée
    if (gameState.base_position_x === x && gameState.base_position_y === y) {
      actions.push({
        label: 'Entrer dans la base',
        onClick: () => setShowBase(true),
        variant: 'default'
      });
    }

    if (actions.length > 0) {
      setSelectedAction({
        title: `Case (${x}, ${y}) - ${cell.type}`,
        actions
      });
    }
  };

  const handleMove = async (x: number, y: number) => {
    if (!gameState) return;

    const newDiscovered = [...gameState.grille_decouverte];
    
    // Découvrir les cases adjacentes
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const newY = y + dy;
        const newX = x + dx;
        if (newY >= 0 && newY < 7 && newX >= 0 && newX < 7) {
          if (!newDiscovered[newY]) newDiscovered[newY] = [];
          newDiscovered[newY][newX] = true;
        }
      }
    }

    await updateGameState({
      position_x: x,
      position_y: y,
      grille_decouverte: newDiscovered,
      energie: Math.max(0, gameState.energie - 5)
    });

    setSelectedAction(null);
    toast.success(`Déplacé vers (${x}, ${y})`);
  };

  const handleGatherWood = async () => {
    if (!gameState) return;

    await updateGameState({
      energie: Math.max(0, gameState.energie - 10)
    });

    setSelectedAction(null);
    toast.success('Bois collecté !');
  };

  const handleDrinkWater = async () => {
    if (!gameState) return;

    await updateGameState({
      soif: Math.min(100, gameState.soif + 20),
      energie: Math.max(0, gameState.energie - 5)
    });

    setSelectedAction(null);
    toast.success('Vous avez bu de l\'eau fraîche !');
  };

  const handleInstallBase = async (x: number, y: number) => {
    if (!gameState) return;

    await updateGameState({
      base_position_x: x,
      base_position_y: y,
      energie: Math.max(0, gameState.energie - 20)
    });

    setSelectedAction(null);
    toast.success('Base installée avec succès !');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Aucune partie trouvée</div>
      </div>
    );
  }

  // Afficher la vue de la base si demandé
  if (showBase) {
    return <BaseView onExit={() => setShowBase(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">Jeu de Survie</h1>
        
        <GameStats gameState={gameState} />
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Carte du monde</h2>
          <MapGrid 
            gameState={gameState}
            mapLayout={mapLayout}
            onCellClick={handleCellClick}
          />
        </div>

        {selectedAction && (
          <ActionModal
            isOpen={!!selectedAction}
            onClose={() => setSelectedAction(null)}
            title={selectedAction.title}
            actions={selectedAction.actions}
          />
        )}
      </div>
    </div>
  );
};

export default Index;