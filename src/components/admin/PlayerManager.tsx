import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { showError } from '@/utils/toast';
import PlayerDetailModal from './PlayerDetailModal';
import { PlayerProfile } from '@/types/admin';

const PlayerManager = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (error) {
        showError("Erreur lors du chargement des joueurs.");
        console.error(error);
      } else {
        setPlayers(data as PlayerProfile[]);
      }
      setLoading(false);
    };
    fetchPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => 
      p.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [players, searchTerm]);

  return (
    <div className="bg-gray-800/50 border border-gray-700 text-white p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Gestion des Joueurs</h2>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Rechercher par pseudo ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-900/50 border-gray-600 pl-10"
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredPlayers.map(player => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
              <div>
                <p className="font-bold">{player.username || <span className="italic text-gray-400">Sans pseudo</span>}</p>
                <p className="text-xs text-gray-400 font-mono">{player.id}</p>
              </div>
              <Button onClick={() => setSelectedPlayer(player)}>Gérer</Button>
            </div>
          ))}
        </div>
      )}
      {selectedPlayer && (
        <PlayerDetailModal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          player={selectedPlayer}
        />
      )}
    </div>
  );
};

export default PlayerManager;