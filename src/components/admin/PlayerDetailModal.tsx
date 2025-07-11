import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { PlayerProfile } from './PlayerManager';
import { MapCell } from '@/types/game';

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onPlayerUpdate: (player: PlayerProfile) => void;
  mapLayout: MapCell[];
}

const PlayerDetailModal = ({ isOpen, onClose, player, onPlayerUpdate, mapLayout }: PlayerDetailModalProps) => {
  const [role, setRole] = useState(player.role);
  const [isBanned, setIsBanned] = useState(player.is_banned);
  const [banReason, setBanReason] = useState(player.ban_reason || '');
  const [baseZoneId, setBaseZoneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPlayerState = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('player_states')
        .select('base_zone_id')
        .eq('id', player.id)
        .single();

      if (error) {
        console.error("Error fetching player state:", error);
      } else if (data) {
        setBaseZoneId(data.base_zone_id ? String(data.base_zone_id) : null);
      }
      setLoading(false);
    };

    if (isOpen) {
      fetchPlayerState();
      setRole(player.role);
      setIsBanned(player.is_banned);
      setBanReason(player.ban_reason || '');
    }
  }, [isOpen, player]);

  const handleSave = async () => {
    setSaving(true);
    const profileUpdates = {
      role,
      is_banned: isBanned,
      ban_reason: isBanned ? banReason : null,
    };

    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', player.id)
      .select()
      .single();

    if (profileError) {
      showError("Erreur lors de la mise à jour du profil.");
      console.error(profileError);
      setSaving(false);
      return;
    }

    if (baseZoneId !== null) {
      const { error: stateError } = await supabase
        .from('player_states')
        .update({ base_zone_id: Number(baseZoneId) })
        .eq('id', player.id);

      if (stateError) {
        showError("Erreur lors de la mise à jour de la base.");
        console.error(stateError);
        setSaving(false);
        return;
      }
    }

    showSuccess("Joueur mis à jour.");
    onPlayerUpdate(updatedProfile as PlayerProfile);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Détails de {player.username || 'Joueur Anonyme'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Rôle</Label>
              <Select value={role} onValueChange={(value: 'player' | 'admin') => setRole(value)}>
                <SelectTrigger className="col-span-3 bg-gray-900 border-gray-600">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="player">Joueur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="base" className="text-right">Base</Label>
              <Select value={baseZoneId || ''} onValueChange={setBaseZoneId}>
                <SelectTrigger className="col-span-3 bg-gray-900 border-gray-600">
                  <SelectValue placeholder="Sélectionner une base" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {mapLayout.map(zone => (
                    <SelectItem key={zone.id} value={String(zone.id)}>{zone.type} ({zone.x},{zone.y})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="is-banned" checked={isBanned} onCheckedChange={setIsBanned} />
              <Label htmlFor="is-banned">Banni</Label>
            </div>
            {isBanned && (
              <div className="space-y-2">
                <Label htmlFor="ban-reason">Raison du bannissement</Label>
                <Textarea id="ban-reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="bg-gray-900 border-gray-600" />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDetailModal;