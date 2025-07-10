import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from './PlayerManager';
import { Loader2, MapPin, Home, ShieldBan, ShieldCheck, User, Mail } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ActionModal from '@/components/ActionModal';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapCell } from '@/types/game';

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onPlayerUpdate: () => void;
}

const PlayerDetailModal = ({ isOpen, onClose, player, onPlayerUpdate }: PlayerDetailModalProps) => {
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [baseLocation, setBaseLocation] = useState('Aucune');
  const [baseZoneId, setBaseZoneId] = useState<number | null>(null);
  const [allZones, setAllZones] = useState<MapCell[]>([]);
  const [currentZone, setCurrentZone] = useState('Inconnue');
  const [banReason, setBanReason] = useState(player.ban_reason || '');
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'ban' | 'unban';
  }>({ isOpen: false, type: 'ban' });

  const fetchPlayerDetails = useCallback(async () => {
    setLoadingDetails(true);
    const { data, error } = await supabase
      .from('player_states')
      .select('current_zone_id, base_zone_id, base_position_x, base_position_y')
      .eq('id', player.id)
      .single();

    if (error) {
      showError("Erreur de chargement des détails.");
    } else if (data) {
      if (data.base_zone_id) {
        const { data: zoneData } = await supabase.from('map_layout').select('type').eq('id', data.base_zone_id).single();
        setBaseLocation(zoneData ? `${zoneData.type} (${data.base_position_x}, ${data.base_position_y})` : 'Inconnue');
        setBaseZoneId(data.base_zone_id);
      } else {
        setBaseLocation('Aucune');
        setBaseZoneId(null);
      }

      if (data.current_zone_id) {
        const { data: zoneData } = await supabase.from('map_layout').select('type').eq('id', data.current_zone_id).single();
        setCurrentZone(zoneData?.type || 'Inconnue');
      }
    }
    setLoadingDetails(false);
  }, [player.id]);

  useEffect(() => {
    const fetchZones = async () => {
      const { data, error } = await supabase.from('map_layout').select('*').order('type');
      if (!error && data) {
        setAllZones(data);
      }
    };

    if (isOpen) {
      fetchPlayerDetails();
      fetchZones();
      setBanReason(player.ban_reason || '');
    }
  }, [isOpen, fetchPlayerDetails, player.ban_reason]);

  const handleBan = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: true, ban_reason: banReason })
      .eq('id', player.id);
    
    if (error) {
      showError("Erreur lors du bannissement.");
    } else {
      showSuccess("Joueur banni.");
      onPlayerUpdate();
      onClose();
    }
    setActionModal({ isOpen: false, type: 'ban' });
  };

  const handleUnban = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: false, ban_reason: null })
      .eq('id', player.id);

    if (error) {
      showError("Erreur lors du débannissement.");
    } else {
      showSuccess("Joueur débanni.");
      onPlayerUpdate();
      onClose();
    }
    setActionModal({ isOpen: false, type: 'unban' });
  };

  const handleBaseLocationChange = async (newZoneIdStr: string) => {
    setLoadingDetails(true);
    let updatePayload;

    if (newZoneIdStr === '') {
        updatePayload = {
            base_zone_id: null,
            base_position_x: null,
            base_position_y: null,
        };
    } else {
        const newZoneId = parseInt(newZoneIdStr, 10);
        if (isNaN(newZoneId)) { setLoadingDetails(false); return; }

        const selectedZone = allZones.find(z => z.id === newZoneId);
        if (!selectedZone) { setLoadingDetails(false); return; }
        
        updatePayload = {
            base_zone_id: selectedZone.id,
            base_position_x: selectedZone.x,
            base_position_y: selectedZone.y,
        };
    }

    const { error } = await supabase
        .from('player_states')
        .update(updatePayload)
        .eq('id', player.id);

    if (error) {
        showError(`Erreur de mise à jour: ${error.message}`);
    } else {
        showSuccess("L'emplacement de la base a été mis à jour.");
        fetchPlayerDetails();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">{player.username || 'Joueur Anonyme'}</DialogTitle>
            <DialogDescription className="text-gray-400">ID: {player.id}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <span>Username: <span className="font-bold">{player.username || 'Non défini'}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <span>Email: <span className="font-bold">{player.email || 'Non disponible'}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span>Position: {loadingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">{currentZone}</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-gray-400" />
              {loadingDetails ? (
                  <>
                      <span>Base:</span>
                      <Loader2 className="w-4 h-4 animate-spin" />
                  </>
              ) : (
                  <>
                      <label htmlFor="base-location-select" className="shrink-0">Base:</label>
                      <Select onValueChange={handleBaseLocationChange} value={baseZoneId?.toString() ?? ''}>
                          <SelectTrigger id="base-location-select" className="w-full sm:w-[280px] bg-slate-700 border-slate-600">
                              <SelectValue placeholder="Aucune base" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectGroup>
                                  <SelectLabel>Zones disponibles</SelectLabel>
                                  <SelectItem value="">Aucune base</SelectItem>
                                  {allZones.map(zone => (
                                      <SelectItem key={zone.id} value={zone.id.toString()}>
                                          {zone.type} ({zone.x}, {zone.y})
                                      </SelectItem>
                                  ))}
                              </SelectGroup>
                          </SelectContent>
                      </Select>
                  </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {player.is_banned ? (
                <>
                  <ShieldBan className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">Banni: <span className="font-bold">{player.ban_reason || 'Aucune raison'}</span></span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                  <span className="text-green-400">Statut: <span className="font-bold">Actif</span></span>
                </>
              )}
            </div>
            {player.is_banned ? (
              <Button variant="outline" className="w-full" onClick={() => setActionModal({ isOpen: true, type: 'unban' })}>
                Débannir le joueur
              </Button>
            ) : (
              <div className="space-y-2">
                <Input 
                  placeholder="Raison du bannissement" 
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="bg-slate-700 border-slate-600"
                />
                <Button variant="destructive" className="w-full" onClick={() => setActionModal({ isOpen: true, type: 'ban' })}>
                  Bannir le joueur
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.type === 'ban' ? "Confirmer le bannissement" : "Confirmer le débannissement"}
        description={actionModal.type === 'ban' ? `Voulez-vous vraiment bannir ${player.username || 'ce joueur'} ?` : `Voulez-vous vraiment débannir ${player.username || 'ce joueur'} ?`}
        actions={[
          { label: "Confirmer", onClick: actionModal.type === 'ban' ? handleBan : handleUnban, variant: "destructive" },
          { label: "Annuler", onClick: () => setActionModal({ ...actionModal, isOpen: false }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default PlayerDetailModal;