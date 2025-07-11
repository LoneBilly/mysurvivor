import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Loader2, User, Shield, Ban, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showSuccess, showError } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';

type PlayerProfile = {
  id: string;
  username: string | null;
  role: 'player' | 'admin';
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
};

const PlayerManager = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isBanConfirmOpen, setIsBanConfirmOpen] = useState(false);

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

  const handleBanToggle = async () => {
    if (!selectedPlayer) return;

    const newBanStatus = !selectedPlayer.is_banned;
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: newBanStatus, ban_reason: newBanStatus ? banReason : null })
      .eq('id', selectedPlayer.id);

    if (error) {
      showError(`Erreur lors de la mise à jour du statut du joueur.`);
      console.error('Error updating ban status:', error);
    } else {
      showSuccess(`Le joueur a été ${newBanStatus ? 'banni' : 'débanni'}.`);
      fetchPlayers();
    }
    setIsBanConfirmOpen(false);
    setSelectedPlayer(null);
    setBanReason('');
  };

  const openBanConfirm = (player: PlayerProfile) => {
    setSelectedPlayer(player);
    setBanReason(player.ban_reason || '');
    setIsBanConfirmOpen(true);
  };

  const filteredPlayers = players.filter(p =>
    (p.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
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
                placeholder="Rechercher par pseudo ou ID..."
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
                <TableHead className="text-white">Pseudo</TableHead>
                <TableHead className="text-white">Role</TableHead>
                <TableHead className="text-white">Statut</TableHead>
                <TableHead className="text-white">Inscrit le</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map(player => (
                <TableRow key={player.id} className="border-gray-700 hover:bg-gray-800/60">
                  <TableCell>
                    <div className="font-medium">{player.username || <span className="text-gray-500">Non défini</span>}</div>
                    <div className="text-xs text-gray-400">{player.id}</div>
                  </TableCell>
                  <TableCell>
                    {player.role === 'admin' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300">
                        <User className="w-3 h-3 mr-1" />
                        Joueur
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {player.is_banned ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                        <Ban className="w-3 h-3 mr-1" />
                        Banni
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Actif
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(player.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openBanConfirm(player)}>
                      {player.is_banned ? 'Débannir' : 'Bannir'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isBanConfirmOpen} onOpenChange={setIsBanConfirmOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Confirmer le {selectedPlayer?.is_banned ? 'débannissement' : 'bannissement'}</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de {selectedPlayer?.is_banned ? 'débannir' : 'bannir'} le joueur {selectedPlayer?.username || selectedPlayer?.id}.
            </DialogDescription>
          </DialogHeader>
          {!selectedPlayer?.is_banned && (
            <div className="grid gap-4 py-4">
              <Textarea
                placeholder="Raison du bannissement (optionnel)"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="bg-gray-800 border-gray-600"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBanConfirmOpen(false)}>Annuler</Button>
            <Button
              variant={selectedPlayer?.is_banned ? "default" : "destructive"}
              onClick={handleBanToggle}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlayerManager;