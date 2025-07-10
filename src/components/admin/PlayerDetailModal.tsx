import { useState, useEffect } from 'react';
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
import { Loader2, Ban, CheckCircle, Home, User, Package, Calendar } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ActionModal from '@/components/ActionModal';
import AdminInventoryModal from './AdminInventoryModal';
import AdminBaseViewer from './AdminBaseViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapCell } from '@/types/game';

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onPlayerUpdate: (player: PlayerProfile) => void;
}

const PlayerDetailModal = ({ isOpen, onClose, player, onPlayerUpdate }: PlayerDetailModalProps) => {
  const [baseLocation, setBaseLocation] = useState<string | null>(null);
  const [baseZoneId, setBaseZoneId] = useState<number | null>(null);
  const [allZones, setAllZones] = useState<MapCell[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isBaseViewerOpen, setIsBaseViewerOpen] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; description: React.ReactNode; }>({ isOpen: false, onConfirm: () => {}, title: '', description: '' });
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchDetails = async () => {
        setLoadingDetails(true);
        
        const { data: zonesData, error: zonesError } = await supabase
          .from('map_layout')
          .select('id, type, x, y')
          .neq('type', 'unknown')
          .order('type');

        if (zonesError) {
          showError("Impossible de charger les zones de la carte.");
        } else {
          setAllZones(zonesData as MapCell[]);
        }

        const { data: playerStateData, error: playerStateError } = await supabase
          .from('player_states')
          .select('base_zone_id')
          .eq('id', player.id)
          .single();

        if (playerStateError && playerStateError.code !== 'PGRST116') {
          showError("Erreur de chargement de l'état du joueur.");
          setBaseLocation('Erreur');
          setBaseZoneId(null);
        } else if (playerStateData?.base_zone_id) {
          const baseZone = (zonesData || []).find(z => z.id === playerStateData.base_zone_id);
          setBaseLocation(baseZone ? baseZone.type : 'Inconnue');
          setBaseZoneId(playerStateData.base_zone_id);
        } else {
          setBaseLocation('Aucune');
          setBaseZoneId(null);
        }

        setLoadingDetails(false);
      };
      fetchDetails();
    }
  }, [isOpen, player.id]);

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
        const newZone = allZones.find(z => z.id === newZoneId);
        setBaseLocation(newZone ? newZone.type : 'Inconnue');
        setBaseZoneId(newZoneId);
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
      onPlayerUpdate({ ...player, is_banned: newBanStatus });
    }
    setModalState({ ...modalState, isOpen: false });
    setBanReason('');
  };

  const openBanModal = () => {
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
              <Home className="w-5 h-5 text-gray-400" />
              <span className="font-medium">Base:</span>
              {loadingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <Select onValueChange={handleBaseLocationChange} value={baseZoneId?.toString()}>
                  <SelectTrigger className="w-full sm:w-[200px] bg-gray-900/50 border-gray-600">
                    <SelectValue placeholder={baseLocation || "Choisir une zone..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {allZones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id.toString()}>
                        {zone.type} ({zone.x}, {zone.y})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
            <Button onClick={openBanModal} variant={player.is_banned ? 'default' : 'destructive'} className="w-full">
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