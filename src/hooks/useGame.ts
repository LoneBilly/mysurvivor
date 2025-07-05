import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGameState } from '@/hooks/useGameState';
import { showError, showSuccess } from '@/utils/toast';
import { GameStats } from '@/types/game';

// Définition de la grille initiale du jeu (7x7)
const initialGrid: string[][] = [
  ['forest', 'forest', 'mountain', 'mountain', 'forest', 'forest', 'water'],
  ['forest', 'forest', 'forest', 'mountain', 'forest', 'water', 'water'],
  ['forest', 'forest', 'forest', 'forest', 'forest', 'water', 'water'],
  ['desert', 'desert', 'start', 'desert', 'desert', 'desert', 'desert'], // Le joueur commence à (3,3)
  ['city', 'city', 'city', 'city', 'city', 'city', 'city'],
  ['forest', 'forest', 'forest', 'forest', 'forest', 'safe_zone', 'forest'],
  ['forest', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest'],
];

export const useGame = () => {
  const { user } = useAuth();
  const {
    gameState,
    loading: gameStateLoading,
    saveGameState,
    discoverCell,
    reload: reloadGameState,
  } = useGameState();

  // États locaux pour la logique de jeu
  const [playerX, setPlayerX] = useState(3);
  const [playerY, setPlayerY] = useState(3);
  const [currentDay, setCurrentDay] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [username, setUsername] = useState('');

  // États dérivés de gameState (chargés depuis la base de données)
  const health = gameState?.vie ?? 100;
  const hunger = gameState?.faim ?? 100;
  const thirst = gameState?.soif ?? 100;
  const energy = gameState?.energie ?? 100;
  const inventory = gameState?.inventaire ?? [];
  const discoveredGrid = gameState?.grille_decouverte ?? Array(7).fill(0).map(() => Array(7).fill(false));

  // Synchroniser les états locaux avec gameState après chargement
  useEffect(() => {
    if (gameState && !gameStateLoading) {
      setPlayerX(gameState.position_x);
      setPlayerY(gameState.position_y);
      setCurrentDay(gameState.jours_survecus);
      // Les autres états (grille_decouverte, inventaire, stats) sont directement dérivés
    }
  }, [gameState, gameStateLoading]);

  // Vérification de la fin du jeu
  useEffect(() => {
    if (health <= 0 || hunger <= 0 || thirst <= 0 || energy <= 0) {
      setIsGameOver(true);
      setGameOverMessage('Vous avez manqué de ressources vitales !');
      showError('Game Over! Vous avez manqué de ressources vitales.');
      setShowSaveDialog(true); // Proposer de sauvegarder le score
    }
  }, [health, hunger, thirst, energy]);

  // Gérer le déplacement du joueur
  const handleMove = useCallback(async (dx: number, dy: number) => {
    if (isGameOver) return;

    const newX = playerX + dx;
    const newY = playerY + dy;

    if (newX >= 0 && newX < 7 && newY >= 0 && newY < 7) {
      // Consommation de ressources pour le mouvement
      const newEnergy = Math.max(0, energy - 5);
      const newHunger = Math.max(0, hunger - 3);
      const newThirst = Math.max(0, thirst - 4);

      await saveGameState({
        position_x: newX,
        position_y: newY,
        energie: newEnergy,
        faim: newHunger,
        soif: newThirst,
      });
      setPlayerX(newX);
      setPlayerY(newY);
      showSuccess(`Déplacé vers (${newX}, ${newY})`);
    } else {
      showError('Impossible de se déplacer en dehors de la grille !');
    }
  }, [playerX, playerY, energy, hunger, thirst, isGameOver, saveGameState]);

  // Gérer la découverte d'une cellule
  const handleDiscoverCell = useCallback(async (x: number, y: number) => {
    if (isGameOver || !gameState) return;

    if (discoveredGrid[y]?.[x]) {
      showSuccess(`Case (${x}, ${y}) déjà découverte.`);
      return;
    }

    await discoverCell(x, y); // Met à jour la grille découverte dans la DB et l'état local

    // Simuler la découverte d'objets ou la rencontre d'événements
    const cellType = initialGrid[y][x];
    if (cellType === 'item') {
      const newItem = 'Ressource Rare'; // Exemple d'objet
      const newInventory = [...inventory, newItem];
      await saveGameState({ inventaire: newInventory });
      showSuccess(`Trouvé une ${newItem} !`);
    } else if (cellType === 'enemy') {
      const newHealth = Math.max(0, health - 20);
      await saveGameState({ vie: newHealth });
      showError('Rencontré un ennemi ! Santé diminuée.');
    }
  }, [isGameOver, gameState, discoveredGrid, discoverCell, inventory, health, saveGameState]);

  // Gérer l'interaction avec la cellule actuelle
  const handleInteract = useCallback(async () => {
    if (isGameOver || !gameState) return;

    const currentCellType = initialGrid[playerY][playerX];
    switch (currentCellType) {
      case 'forest':
        const newEnergy = Math.min(100, energy + 10);
        await saveGameState({ energie: newEnergy });
        showSuccess('Reposé dans la forêt, énergie gagnée !');
        break;
      case 'water':
        const newThirst = Math.min(100, thirst + 20);
        await saveGameState({ soif: newThirst });
        showSuccess('Bu de l\'eau, soif étanchée !');
        break;
      case 'city':
        showSuccess('Trouvé un endroit sûr dans la ville.');
        // Potentiellement ajouter des interactions plus complexes en ville
        break;
      default:
        showError('Rien de spécial à interagir ici.');
    }
  }, [isGameOver, gameState, playerX, playerY, energy, thirst, saveGameState]);

  // Passer au jour suivant
  const handleNextDay = useCallback(async () => {
    if (isGameOver) return;

    const newDay = currentDay + 1;
    const newHunger = Math.max(0, hunger - 10);
    const newThirst = Math.max(0, thirst - 10);
    const newEnergy = Math.max(0, energy - 15);
    const newHealth = Math.max(0, health - 5); // Drain de santé passif

    await saveGameState({
      jours_survecus: newDay,
      faim: newHunger,
      soif: newThirst,
      energie: newEnergy,
      vie: newHealth,
    });
    setCurrentDay(newDay);
    showSuccess(`Le jour ${newDay} commence !`);
  }, [isGameOver, currentDay, hunger, thirst, energy, health, saveGameState]);

  // Utiliser un objet de l'inventaire
  const handleUseItem = useCallback(async (item: string) => {
    if (isGameOver || !gameState) return;

    const itemIndex = inventory.indexOf(item);
    if (itemIndex === -1) {
      showError('Objet non trouvé dans l\'inventaire.');
      return;
    }

    const newInventory = [...inventory];
    newInventory.splice(itemIndex, 1); // Supprimer l'objet

    let updatedStats: Partial<GameStats> = {};
    switch (item) {
      case 'Ressource Rare':
        updatedStats = { vie: Math.min(100, health + 15), energie: Math.min(100, energy + 10) };
        showSuccess('Utilisé la Ressource Rare, gagné de la santé et de l\'énergie !');
        break;
      // Ajouter d'autres effets d'objets ici
      default:
        showError('Effet d\'objet inconnu.');
        return;
    }

    await saveGameState({
      inventaire: newInventory,
      ...updatedStats,
    });
    showSuccess(`Utilisé ${item}.`);
  }, [isGameOver, gameState, inventory, health, energy, saveGameState]);

  // Gérer la sauvegarde du jeu
  const handleSaveGame = useCallback(async () => {
    if (!user || !gameState || !username) {
      showError('Impossible de sauvegarder le jeu : utilisateur non connecté, état du jeu non chargé ou nom d\'utilisateur vide.');
      return;
    }

    try {
      // Mettre à jour le nom d'utilisateur du profil si différent
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (!profileData || profileData.username !== username) {
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ username: username })
          .eq('id', user.id);
        if (updateProfileError) throw updateProfileError;
      }

      // Mettre à jour le classement
      const { data: leaderboardEntry, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('player_id', user.id)
        .single();

      if (leaderboardError && leaderboardError.code !== 'PGRST116') throw leaderboardError;

      const currentZone = initialGrid[playerY][playerX];

      if (leaderboardEntry) {
        // Mettre à jour l'entrée existante
        const { error: updateError } = await supabase
          .from('leaderboard')
          .update({
            username: username,
            current_zone: currentZone,
            days_alive: currentDay,
            last_updated_at: new Date().toISOString(),
          })
          .eq('player_id', user.id);
        if (updateError) throw updateError;
      } else {
        // Insérer une nouvelle entrée
        const { error: insertError } = await supabase
          .from('leaderboard')
          .insert({
            player_id: user.id,
            username: username,
            current_zone: currentZone,
            days_alive: currentDay,
          });
        if (insertError) throw insertError;
      }

      showSuccess('Jeu sauvegardé et classement mis à jour !');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du jeu ou de la mise à jour du classement :', error);
      showError('Échec de la sauvegarde du jeu ou de la mise à jour du classement.');
    }
  }, [user, gameState, username, currentDay, playerX, playerY]);

  // Fermer la boîte de dialogue de sauvegarde
  const handleCloseSaveDialog = useCallback(() => {
    setShowSaveDialog(false);
  }, []);

  // Redémarrer le jeu
  const handleRestartGame = useCallback(async () => {
    if (!user) {
      showError('Impossible de redémarrer le jeu : utilisateur non connecté.');
      return;
    }

    try {
      // Réinitialiser l'état du jeu pour l'utilisateur actuel
      await saveGameState({
        jours_survecus: 1,
        vie: 100,
        faim: 100,
        soif: 100,
        energie: 100,
        grille_decouverte: Array(7).fill(0).map(() => Array(7).fill(false)),
        inventaire: [],
        position_x: 3,
        position_y: 3,
      });

      setIsGameOver(false);
      setGameOverMessage('');
      setShowSaveDialog(false);
      showSuccess('Jeu redémarré !');
      reloadGameState(); // Recharger l'état depuis la DB pour assurer la cohérence
    } catch (error) {
      console.error('Erreur lors du redémarrage du jeu :', error);
      showError('Échec du redémarrage du jeu.');
    }
  }, [user, saveGameState, reloadGameState]);

  return {
    grid: initialGrid,
    playerX,
    playerY,
    discoveredGrid,
    isGameOver,
    gameOverMessage,
    showSaveDialog,
    username,
    setUsername,
    handleSaveGame,
    handleCloseSaveDialog,
    handleRestartGame,
    handleMove,
    handleDiscoverCell,
    handleInteract,
    handleNextDay,
    handleUseItem,
    inventory,
    currentDay,
    health,
    hunger,
    thirst,
    energy,
    loading: gameStateLoading, // Exposer l'état de chargement de useGameState
  };
};