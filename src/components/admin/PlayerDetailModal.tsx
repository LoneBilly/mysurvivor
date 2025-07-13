import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from './PlayerManager';
import { Ban, CheckCircle, Home, User, Package, Calendar, Shield, Coins, SlidersHorizontal } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ActionModal from '../ActionModal';
import AdminInventoryModal from './AdminInventoryModal';
import AdminBaseViewer from './AdminBaseViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { MapCell } from '@/types/game';
import AdminStatEditorModal from './AdminStatEditorModal';

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
  const [isStatEditorOpen, setIsStatEditorOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  const currentBaseZone = mapLayout.find(
    (cell) => cell.x === player.base_zone_x && cell.y === player.base_zone_y
  );

  const handleBaseChange = async (newZoneIdStr: string) => {
    const newZoneId = parseInt(newZoneIdStr, 10);
    if (isNaN(newZoneId)) return;

    const newZone = mapLayout.find(cell => cell.id === newZoneId);
    if (!newZone) {
      showError("Zone sélectionnée invalide.");
      return;
    }

    const { error } = await supabase
      .from('player_states')
      .update({ base_zone_id: newZoneId })
      .eq('id', player.id);

    if (error) {
      showError("Erreur lors du déplacement de la base.");
      console.error(error);
    } else {
      showSuccess("La base du joueur a été déplacée.");
      onPlayerUpdate({ 
        ...player, 
        base_zone_type: newZone.type,
        base_zone_x: newZone.x,
        base_zone_y: newZone.y,
      });
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
    setIsBanModalOpen(false);
    setBanReason('');
  };

  const openBanModal = () => {
    setBanReason(player.ban_reason || '');
    setIsBanModalOpen(true);
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
            <DialogDescription className="sr-only">Détails et gestion du joueur {player.username || 'Joueur Anonyme'}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span>Inscrit le: <span className="font-bold">{new Date(player.created_at).toLocaleDateString()}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-gray-400" />
              <span>Crédits: <span className="font-bold">{player.credits ?? 0}</span></span>
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
              <Select 
                onValueChange={handleBaseChange} 
                value={currentBaseZone?.id.toString()}
                disabled={!mapLayout.length}
              >
                <SelectTrigger className="w-full bg-gray-900/50 border-gray-600">
                  <SelectValue placeholder="Choisir une base..." />
                </SelectTrigger>
                <SelectContent>
                  {mapLayout
                    .filter(cell => cell.type.toLowerCase() !== 'unknown')
                    .map(cell => (
                      <SelectItem key={cell.id} value={cell.id.toString()}>
                        {cell.type} ({cell.x}, {cell.y})
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
            <Button onClick={() => setIsStatEditorOpen(true)} className="w-full flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Modifier les stats
            </Button>
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
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        title={`${player.is_banned ? 'Lever le bannissement' : 'Bannir'} ${player.username}`}
        description={<p>{`Êtes-vous sûr de vouloir ${player.is_banned ? 'autoriser de nouveau' : 'bannir'} ce joueur ?`}</p>}
        actions={[
          { label: "Confirmer", onClick: handleToggleBan, variant: "destructive" },
          { label: "Annuler", onClick: () => setIsBanModalOpen(false), variant: "secondary" },
        ]}
      >
        {!player.is_banned && (
          <Textarea
            placeholder="Raison du bannissement (optionnel)"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            className="bg-white/5 border-white/20 mt-4"
          />
        )}
      </ActionModal>
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
      <AdminStatEditorModal
        isOpen={isStatEditorOpen}
        onClose={() => setIsStatEditorOpen(false)}
        player={player}
        onPlayerUpdate={onPlayerUpdate}
      />
    </>
  );
};

export default PlayerDetailModal;