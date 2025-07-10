import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Ban, CheckCircle, Loader2, Search } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ActionModal from '@/components/ActionModal';

interface PlayerProfile {
  id: string;
  username: string | null;
  created_at: string;
  is_banned: boolean;
}

const PlayerManager = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, created_at, is_banned')
      .order('created_at', { ascending: false });

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

  const handleToggleBan = async (player: PlayerProfile) => {
    const newBanStatus = !player.is_banned;
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: newBanStatus })
      .eq('id', player.id);

    if (error) {
      showError(`Erreur lors de la modification du statut de ${player.username}.`);
    } else {
      showSuccess(`Le statut de ${player.username} a été mis à jour.`);
      setPlayers(players.map(p => p.id === player.id ? { ...p, is_banned: newBanStatus } : p));
    }
    setModalState({ ...modalState, isOpen: false });
  };

  const openBanModal = (player: PlayerProfile) => {
    setModalState({
      isOpen: true,
      title: `${player.is_banned ? 'Lever le bannissement de' : 'Bannir'} ${player.username}`,
      description: `Êtes-vous sûr de vouloir ${player.is_banned ? 'autoriser de nouveau' : 'bannir'} ce joueur ?`,
      onConfirm: () => handleToggleBan(player),
    });
  };

  const filteredPlayers = players.filter(p =>
    p.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
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
                <TableHead>Pseudo</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map(player => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.username || 'N/A'}</TableCell>
                  <TableCell>{new Date(player.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {player.is_banned ? (
                      <span className="flex items-center text-red-400"><Ban className="w-4 h-4 mr-2" /> Banni</span>
                    ) : (
                      <span className="flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-2" /> Actif</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Ouvrir le menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openBanModal(player)}>
                          {player.is_banned ? 'Lever le bannissement' : 'Bannir le joueur'}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>Voir l'inventaire</DropdownMenuItem>
                        <DropdownMenuItem disabled>Ajouter un objet</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ActionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        description={modalState.description}
        actions={[
          { label: "Confirmer", onClick: modalState.onConfirm, variant: "destructive" },
          { label: "Annuler", onClick: () => setModalState({ ...modalState, isOpen: false }), variant: "secondary" },
        ]}
      />
    </div>
  );
};

export default PlayerManager;