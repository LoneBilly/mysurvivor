import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showError } from '@/utils/toast';
import PlayerDetailModal from './PlayerDetailModal';
import { cn } from '@/lib/utils';

export type PlayerProfile = {
  id: string;
  username: string | null;
  role: 'player' | 'admin';
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
};

type SortKey = 'username' | 'created_at';

const PlayerManager = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching players:', error);
      showError('Impossible de charger les joueurs.');
    } else {
      setPlayers(data as PlayerProfile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handlePlayerUpdate = (updatedPlayer: PlayerProfile) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(p => (p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p))
    );
    if (selectedPlayer && selectedPlayer.id === updatedPlayer.id) {
      setSelectedPlayer({ ...selectedPlayer, ...updatedPlayer });
    }
  };

  const openPlayerDetails = (player: PlayerProfile) => {
    setSelectedPlayer(player);
    setIsDetailModalOpen(true);
  };

  const closePlayerDetails = () => {
    setIsDetailModalOpen(false);
    setSelectedPlayer(null);
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPlayers = useMemo(() => {
    const filteredPlayers = players.filter(p =>
      (p.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return [...filteredPlayers].sort((a, b) => {
      if (sortConfig.key === 'username') {
        const nameA = a.username || '';
        const nameB = b.username || '';
        // Utilisation de localeCompare pour un tri alphabétique correct et insensible à la casse
        const comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      } else { // created_at
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
  }, [players, searchTerm, sortConfig]);

  const SortableHeader = ({ sortKey, children }: { sortKey: SortKey, children: React.ReactNode }) => (
    <TableHead className="text-white cursor-pointer" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center gap-2">
        {children}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
        )}
      </div>
    </TableHead>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par pseudo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                <SortableHeader sortKey="username">Pseudo</SortableHeader>
                <SortableHeader sortKey="created_at">Inscrit le</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map(player => (
                <TableRow 
                  key={player.id} 
                  className="border-gray-700 hover:bg-gray-800/60 cursor-pointer"
                  onClick={() => openPlayerDetails(player)}
                >
                  <TableCell>
                    <div className="font-medium">{player.username || <span className="text-gray-500">Joueur Anonyme</span>}</div>
                  </TableCell>
                  <TableCell>{new Date(player.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedPlayer && (
        <PlayerDetailModal
          isOpen={isDetailModalOpen}
          onClose={closePlayerDetails}
          player={selectedPlayer}
          onPlayerUpdate={handlePlayerUpdate}
        />
      )}
    </>
  );
};

export default PlayerManager;