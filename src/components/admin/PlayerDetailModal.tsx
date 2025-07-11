import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from './PlayerManager';
import { Ban, CheckCircle, Home, User, Package, Calendar, Shield } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ActionModal from '@/components/ActionModal';
import AdminInventoryModal from './AdminInventoryModal';
import AdminBaseViewer from './AdminBaseViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapCell } from '@/types/game';
import { useAuth } from '@/contexts/AuthContext';

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onPlayerUpdate: (player: PlayerProfile) => void;
  mapLayout: MapCell[];
}

const PlayerDetailModal = ({ isOpen, onClose, player, onPlayerUpdate, mapLayout }: PlayerDetailModalProps) => {
  const { user: adminUser } = useAuth();
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isBaseViewerOpen, setIsBaseViewerOpen] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; description: React.ReactNode; }>({ isOpen: false, onConfirm: () => {}, title: '', description: '' });
  const [banReason, setBanReason] = useState('');

  const validMapLayout = useMemo(() => {
    if (!mapLayout) return [];
    return mapLayout.filter(zone => zone.type !== 'Inconnue');
  }, [mapLayout]);

  const currentBaseId = player.player_states?.[0]?.base_zone_id;
  const baseExistsInValidMap = useMemo(() => 
    validMapLayout.some(zone => zone.id === currentBaseId), 
    [validMapLayout, currentBaseId]
  );
  const selectValue = (currentBaseId != null && baseExistsInValidMap) ? String(currentBaseId) : undefined;

  const handleBaseLocationChange = async (newZoneIdStr: string) => {
    const newZoneId = parseInt(newZoneIdStr, 10);
    if (isNaN(newZoneId)) return;

    const { error } = await supabase
        .from('player_states')
        .update({ base_zone_id: newZoneId })
        .eq('id', player.id);

    if (error) {
        showError("Erreur lors du déplacement de la base.");
    } else {
        showSuccess("La base du joueur a été déplacée.");
        const playerState = player.player_states?.[0] || {};
        const updatedPlayerState = { ...playerState, base_zone_id: newZoneId };
        const updatedPlayer = { ...player, player_states: [updatedPlayerState] };
        onPlayerUpdate(updatedPlayer as PlayerProfile);
    }
  };

  const handleRoleChange = async (newRole: 'player' | 'admin') => {
    if (player.id === adminUser?.id && newRole === 'player') {
      showError("Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', player.id);

    if (error) {
      showError("Erreur lors du changement de rôle.");
      console.error(error);
    } else {
      showSuccess("Rôle mis à jour.");
      onPlayerUpdate({ ...player, role: newRole });
    }
  };

  const handleToggleBan = async () => {
    const newBanStatus = !player.is_banned;
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: newBanStatus, ban_reason: newBanStatus ? banReason : null })
      .eq('id', player.id);

    if (error) {
      showError(`Erreur lors de la modification du statut de ${player.username}.`);
    } else {
      showSuccess(`Le statut de ${player.username} a été mis à jour.`);
      onPlayerUpdate({ ...player, is_banned: newBanStatus, ban_reason: newBanStatus ? banReason : null });
    }
    setModalState({ ...modalState, isOpen: false });
    setBanReason('');
  };

  const openBanModal = () => {
    setBanReason(player.ban_reason || '');
    setModalState({
      isOpen: true,
      title: `${player.is_banned ? 'Lever le bannissement' : 'Bannir'} ${player.username}`,
      description: (
        <div className="space-y-2 mt-4">
          <p>{`Êtes-vous sûr de vouloir ${player.is_banned ? 'autoriser de nouveau' : 'bannir'} ce joueur ?`}</p>
          {!player.is_banned && (
            <Textarea
              placeholder="Raison du bannissement (optionnel)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="bg-white/5 border-white/20"
            />
          )}
        </div>
      ),
      onConfirm: handleToggleBan,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="text-center">
            <User className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
              {player.username || 'Joueur Anonyme'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span>Inscrit le: <span className="font-bold">{new Date(player.created_at).toLocaleDateString()}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <span className="font-medium">Rôle:</span>
              <Select onValueChange={(value) => handleRoleChange(value as 'player' | 'admin')} value={player.role}>
                <SelectTrigger className="w-full sm:w-[200px] bg-gray-900/50 border-gray-600">
                  <SelectValue placeholder="Choisir un rôle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Joueur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-gray-400" />
              <span className="font-medium">Base:</span>
              <Select onValueChange={handleBaseLocationChange} value={selectValue}>
                <SelectTrigger className="w-full sm:w-[200px] bg-gray-900/50 border-gray-600">
                  <SelectValue placeholder="Aucune base" />
                </SelectTrigger>
                <SelectContent>
                  {validMapLayout.map(zone => (
                      <SelectItem key={zone.id} value={String(zone.id)}>
                        {zone.type} ({zone.x}, {zone.y})
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              {player.is_banned ? (
                <>
                  <Ban className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">Statut: Banni</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400">Statut: Actif</span>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
            <Button onClick={() => setIsBaseViewerOpen(true)} className="w-full flex items-center gap-2">
              <Home className="w-4 h-4" />
              Voir la base
            </Button>
            <Button onClick={() => setIsInventoryOpen(true)} className="w-full flex items-center gap-2">
              <Package className="w-4 h-4" /> Voir l'inventaire
            </Button>
            <Button onClick={openBanModal} variant={player.is_banned ? 'default' : 'destructive'} className="w-full" disabled={player.id === adminUser?.id}>
              {player.is_banned ? 'Lever le bannissement' : 'Bannir le joueur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <AdminInventoryModal 
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        player={player}
      />
      <AdminBaseViewer
        isOpen={isBaseViewerOpen}
        onClose={() => setIsBaseViewerOpen(false)}
        playerId={player.id}
        playerUsername={player.username}
      />
    </>
  );
};

export default PlayerDetailModal;