import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Map, Heart, Utensils, Droplet, BatteryCharging } from 'lucide-react';

interface PlayerState {
  username: string;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  current_zone_id: number;
  zones_decouvertes: number[];
  jours_survecus: number;
}

interface MapLayout {
  id: number;
  type: string;
  icon: string;
}

const FloatingInfobar: React.FC = () => {
  const { data: playerState, isLoading: isLoadingPlayerState } = useQuery<PlayerState>({
    queryKey: ['playerState'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');
      const { data, error } = await supabase
        .from('player_states')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!supabase.auth.getUser(), // Only fetch if user is likely logged in
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: mapLayout, isLoading: isLoadingMapLayout } = useQuery<MapLayout[]>({
    queryKey: ['mapLayout'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('map_layout')
        .select('*');
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const currentZone = mapLayout?.find(zone => zone.id === playerState?.current_zone_id);

  if (isLoadingPlayerState || isLoadingMapLayout) {
    return null; // Or a loading spinner
  }

  if (!playerState) {
    return null; // Don't show if no player state
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 flex items-center space-x-6">
      <div className="flex items-center space-x-2">
        <Map className="h-5 w-5 text-blue-400" />
        <span>Zone: {currentZone?.type || 'Inconnue'}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Heart className="h-5 w-5 text-red-500" />
        <span>Vie: {playerState.vie}%</span>
      </div>
      <div className="flex items-center space-x-2">
        <Utensils className="h-5 w-5 text-yellow-500" />
        <span>Faim: {playerState.faim}%</span>
      </div>
      <div className="flex items-center space-x-2">
        <Droplet className="h-5 w-5 text-blue-300" />
        <span>Soif: {playerState.soif}%</span>
      </div>
      <div className="flex items-center space-x-2">
        <BatteryCharging className="h-5 w-5 text-green-500" />
        <span>Énergie: {playerState.energie}%</span>
      </div>
      <div className="flex items-center space-x-2">
        <span>Jours survécus: {playerState.jours_survecus}</span>
      </div>
      {/* La section 'Top Survivant' a été supprimée */}
    </div>
  );
};

export default FloatingInfobar;