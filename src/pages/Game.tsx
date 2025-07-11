import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import LoadingScreen from '@/components/LoadingScreen';

// Ceci est un placeholder pour votre interface de jeu.
// Vous devriez remplacer son contenu par vos composants de jeu.
const GameUI = () => {
  const navigate = useNavigate();
  return (
    <div className="h-screen bg-gray-800 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl">Interface du Jeu</h1>
      <p className="mt-4">Le jeu est prêt à être développé ici.</p>
      <Button onClick={() => navigate('/')} className="mt-8">Retour à l'accueil</Button>
    </div>
  );
};


const Game = () => {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initialisation...");
  const navigate = useNavigate();

  const loadGameData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingProgress(0);
      setLoadingMessage("Vérification de la session...");
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      await new Promise(resolve => setTimeout(resolve, 200)); // Simule une petite latence
      if (sessionError || !session) {
        showError("Session invalide. Redirection vers la page de connexion.");
        navigate('/login');
        return;
      }
      setLoadingProgress(20);
      setLoadingMessage("Chargement des données du joueur...");

      const { error: playerError } = await supabase.rpc('get_full_player_data', { p_user_id: session.user.id });
      await new Promise(resolve => setTimeout(resolve, 300)); // Simule une petite latence
      if (playerError) throw new Error(`Erreur de chargement du joueur: ${playerError.message}`);
      
      setLoadingProgress(60);
      setLoadingMessage("Chargement des ressources du monde...");

      const { error: mapError } = await supabase.from('map_layout').select('id').limit(1);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simule une petite latence
      if (mapError) throw new Error(`Erreur de chargement de la carte: ${mapError.message}`);
      
      setLoadingProgress(90);
      setLoadingMessage("Préparation de l'interface...");
      
      await new Promise(resolve => setTimeout(resolve, 200));
      setLoadingProgress(100);
      
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoading(false);

    } catch (error: any) {
      console.error("Erreur lors du chargement du jeu:", error);
      showError(error.message || "Une erreur inconnue est survenue.");
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

  if (loading) {
    return <LoadingScreen progress={loadingProgress} message={loadingMessage} />;
  }

  // Une fois le chargement terminé, affichez l'interface de jeu réelle.
  // Pour l'instant, c'est un placeholder.
  return <GameUI />;
};

export default Game;