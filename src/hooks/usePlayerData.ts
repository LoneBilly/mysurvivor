import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { PlayerData } from '../types';

export function usePlayerData() {
  const { user } = useAuth();

  return useQuery<PlayerData>({
    queryKey: ['playerData', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Utilisateur non authentifié");
      const { data, error } = await supabase
        .rpc('get_full_player_data', { p_user_id: user.id })
        .single();
      
      if (error) throw error;
      return data as PlayerData;
    },
    enabled: !!user,
  });
}