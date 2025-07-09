import { supabase } from '@/integrations/supabase/client';
import { Users, HeartPulse } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const fetchStats = async () => {
  const { count: playersCount, error: playersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (playersError) throw playersError;

  const { count: survivorsCount, error: survivorsError } = await supabase
    .from('player_states')
    .select('*', { count: 'exact', head: true });
  
  if (survivorsError) throw survivorsError;

  return { players: playersCount || 0, survivors: survivorsCount || 0 };
};

const FloatingInfoBar = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['landing-stats'],
    queryFn: fetchStats,
    staleTime: 60000, // Les données sont considérées fraîches pendant 1 minute
  });

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-[95%] z-10">
      <div className="flex items-center justify-center space-x-4 bg-white/80 backdrop-blur-sm p-3 rounded-none shadow-[4px_4px_0px_#000] border-2 border-black">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-black" />
          <span className="font-mono text-sm text-black">
            <span className="font-bold">{isLoading ? '...' : stats?.players}</span> Joueurs
          </span>
        </div>
        <div className="w-px h-6 bg-black"></div>
        <div className="flex items-center space-x-2">
          <HeartPulse className="w-5 h-5 text-red-600" />
          <span className="font-mono text-sm text-black">
            <span className="font-bold">{isLoading ? '...' : stats?.survivors}</span> Survivants
          </span>
        </div>
      </div>
    </div>
  );
};

export default FloatingInfoBar;