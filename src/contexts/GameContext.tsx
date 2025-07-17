import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FullPlayerData, Item, CraftingRecipe, LearnedBlueprint } from '@/types/game';
import { showError } from '@/utils/toast';
import { Session } from '@supabase/supabase-js';

interface GameContextType {
  playerData: FullPlayerData | null;
  items: Item[];
  recipes: CraftingRecipe[];
  learnedBlueprints: LearnedBlueprint[];
  loading: boolean;
  session: Session | null;
  getIconUrl: (icon: string | null | undefined) => string | null;
  fetchPlayerData: (force?: boolean) => Promise<void>;
  setPlayerData: React.Dispatch<React.SetStateAction<FullPlayerData | null>>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [learnedBlueprints, setLearnedBlueprints] = useState<LearnedBlueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchStaticData = useCallback(async () => {
    try {
      const [itemsRes, recipesRes] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('crafting_recipes').select('*, items!result_item_id(name, icon)')
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (recipesRes.error) throw recipesRes.error;
      setItems(itemsRes.data as Item[]);
      setRecipes(recipesRes.data as any[]);
    } catch (error: any) {
      showError(`Erreur de chargement des données de jeu: ${error.message}`);
    }
  }, []);

  const fetchPlayerData = useCallback(async (force = false) => {
    if (!session?.user) {
      setPlayerData(null);
      return;
    }
    if (!force && playerData) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_full_player_data', { p_user_id: session.user.id });
      if (error) throw error;
      setPlayerData(data);

      const { data: blueprints, error: blueprintsError } = await supabase
        .from('learned_blueprints')
        .select('*')
        .eq('player_id', session.user.id);
      if (blueprintsError) throw blueprintsError;
      setLearnedBlueprints(blueprints as LearnedBlueprint[]);

    } catch (error: any) {
      showError(`Erreur de chargement des données du joueur: ${error.message}`);
      setPlayerData(null);
    } finally {
      setLoading(false);
    }
  }, [session, playerData]);

  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  useEffect(() => {
    if (session) {
      fetchPlayerData();
    } else {
      setLoading(false);
      setPlayerData(null);
    }
  }, [session, fetchPlayerData]);

  const getIconUrl = useCallback((icon: string | null | undefined): string | null => {
    if (!icon || icon.startsWith('http') || !/^[a-zA-Z0-9_.-]+$/.test(icon)) {
      return icon || null;
    }
    // CORRECTION : Utilisation du bon nom de bucket 'items' au lieu de 'items.icons'
    const { data } = supabase.storage.from('items').getPublicUrl(icon);
    return data.publicUrl;
  }, []);

  const value = {
    playerData,
    items,
    recipes,
    learnedBlueprints,
    loading,
    session,
    getIconUrl,
    fetchPlayerData,
    setPlayerData,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};