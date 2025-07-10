import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from '@/types/admin';
import { Loader2, Home, ShieldBan, ShieldCheck, KeyRound } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { MapCell } from '@/types/game';
import AdminInventoryModal from './AdminInventoryModal';

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
}

interface PlayerDetails extends PlayerProfile {
  base_zone_id: number | null;
  base_location: string;
}

const PlayerDetailModal = ({ isOpen, onClose, player }: PlayerDetailModalProps) => {
  const [details, setDetails] = useState<PlayerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [mapZones, setMapZones] = useState<MapCell[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!isOpen) return;
    setLoadingDetails(true);

    const { data: playerState, error } = await supabase
      .from('player_states')
      .select('base_zone_id')
      .eq('id', player.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      showError("Erreur de chargement des détails du joueur.");
      console.error(error);
      setLoadingDetails(false);
      return;
    }

    let baseLocation = "Aucune";
    let baseZoneId = playerState?.base_zone_id || null;

    if (baseZoneId) {
      const { data: zoneData } = await supabase
        .from('map_layout')
        .select('type')
        .eq('id', baseZoneId)
        .single();
      if (zoneData) {
        baseLocation = zoneData.type;
      }
    }

    setDetails({
      ...player,
      base_zone_id: baseZoneId,
      base_location: baseLocation,
    });
    setLoadingDetails(false);
  }, [isOpen, player]);

  useEffect(() => {
    fetchDetails();
    if (isOpen) {
      const fetchMapZones = async () => {
        const { data, error } = await supabase.from('map_layout').select('id, type').order('type');
        if (error) {
          showError("Impossible de charger les zones de la carte.");
        } else {
          setMapZones(data as MapCell[]);
        }
      };
      fetchMapZones();
    }
  }, [fetchDetails, isOpen]);

  const handleBaseLocationChange = async (newZoneIdStr: string) => {
    const newZoneId = newZoneIdStr ? parseInt(newZoneIdStr, 10) : null;
    
    const { error } = await supabase
      .from('player_states')
      .update({ base_zone_id: newZoneId })
      .eq('id', player.id);

    if (error) {
      showError("Erreur lors de la mise à jour de la base.");
      console.error(error);
    } else {
      showSuccess("Emplacement de la base mis à jour.");
      fetchDetails(); // Refresh details
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
              Détails de {player.username || 'Joueur'}
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-mono">{player.id}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-gray-400" />
              <span>Base:</span>
              {loadingDetails ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Select
                  value={details?.base_zone_id?.toString() || ''}
                  onValueChange={handleBaseLocationChange}
                >
                  <SelectTrigger className="w-[200px] bg-white/5 border-white/20">
                    <SelectValue placeholder="Choisir une zone..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-700">
                    <SelectItem value="">Aucune</SelectItem>
                    {mapZones.map(zone => (
                      <SelectItem key={zone.id} value={String(zone.id)}>
                        {zone.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-3">
              {player.is_banned ? (
                <ShieldBan className="w-5 h-5 text-red-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-green-400" />
              )}
              <span>Status: <span className={player.is_banned ? 'font-bold text-red-400' : 'font-bold text-green-400'}>{player.is_banned ? 'Banni' : 'Actif'}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-gray-400" />
              <span>Rôle: <span className="font-bold">{player.role}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={() => setIsInventoryModalOpen(true)}>Gérer l'inventaire</Button>
            <Button variant="destructive" disabled>Bannir le joueur</Button>
          </div>
        </DialogContent>
      </Dialog>
      {details && (
        <AdminInventoryModal
          isOpen={isInventoryModalOpen}
          onClose={() => setIsInventoryModalOpen(false)}
          player={details}
        />
      )}
    </>
  );
};

export default PlayerDetailModal;