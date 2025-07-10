import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Ban, CheckCircle, ArrowUpDown } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import PlayerDetailModal from './PlayerDetailModal';

export interface PlayerProfile {
  id: string;
  username: string | null;
  created_at: string;
  is_banned: boolean;
}

type SortableKeys = 'username' | 'created_at' | 'is_banned';

const PlayerManager = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'created_at', direction: 'descending' });

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, created_at, is_banned');

    if (error) {
      showError("Impossible de charger les joueurs.");
      console.error(error);
    } else {
      setPlayers(data as PlayerProfile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handlePlayerUpdate = (updatedPlayer: PlayerProfile) => {
    setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
  };

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedPlayers = useMemo(() => {
    const filteredPlayers = players.filter(p =>
      p.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    let sortableItems = [...filteredPlayers];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || bValue === null) return 0;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [players, searchTerm, sortConfig]);

  return (
    <>
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un joueur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900/50 border-gray-600 pl-10"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('username')}>
                      Pseudo <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('created_at')}>
                      Inscrit le <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('is_banned')}>
                      Statut <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlayers.map(player => (
                  <TableRow key={player.id} onClick={() => setSelectedPlayer(player)} className="cursor-pointer">
                    <TableCell className="font-medium">{player.username || 'N/A'}</TableCell>
                    <TableCell>{new Date(player.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {player.is_banned ? (
                        <span className="flex items-center text-red-400"><Ban className="w-4 h-4 mr-2" /> Banni</span>
                      ) : (
                        <span className="flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-2" /> Actif</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {selectedPlayer && (
        <PlayerDetailModal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          player={selectedPlayer}
          onPlayerUpdate={handlePlayerUpdate}
        />
      )}
    </>
  );
};

export default PlayerManager;