import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

const FloatingInfoBar = () => {
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const fetchPlayerCount = async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching player count:', error.message);
        return;
      }

      if (count !== null) {
        setPlayerCount(count);
      }
    };

    fetchPlayerCount();
  }, []);

  if (playerCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto bg-black/60 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-6 text-sm z-20">
      <div className="flex items-center gap-2">
        <Users size={18} />
        <span>{playerCount} survivants ont rejoint la lutte.</span>
      </div>
    </div>
  );
};

export default FloatingInfoBar;