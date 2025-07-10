import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Home, MapPin, Heart, Utensils, GlassWater, Battery, Loader2, ShieldBan, ShieldCheck, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InventoryModal } from "./InventoryModal";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Player {
  id: string;
  username: string;
  role: string;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
}

interface Zone {
  id: number;
  type: string;
  x: number;
  y: number;
}

interface PlayerDetailModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayerUpdate: () => void;
}

export function PlayerDetailModal({ player, isOpen, onClose, onPlayerUpdate }: PlayerDetailModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [isUnbanning, setIsUnbanning] = useState(false);
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const fetchPlayerDetails = async () => {
    if (!player) return;
    setLoadingDetails(true);
    const { data, error } = await supabase.rpc('get_full_player_data', { p_user_id: player.id });
    if (error) {
      console.error("Error fetching player details:", error);
      toast.error("Erreur lors de la récupération des détails du joueur.");
    } else {
      setDetails(data);
      if (data.playerState?.base_zone_id) {
        setSelectedZoneId(data.playerState.base_zone_id.toString());
      }
    }
    setLoadingDetails(false);
  };

  const fetchZones = async () => {
    const { data, error } = await supabase.from('map_layout').select('id, type, x, y').order('type');
    if (error) {
      console.error('Error fetching zones:', error);
      toast.error("Erreur lors de la récupération des zones.");
    } else {
      setZones(data || []);
    }
  };

  useEffect(() => {
    if (isOpen && player) {
      fetchPlayerDetails();
      fetchZones();
    }
  }, [isOpen, player]);

  const handleBan = async () => {
    if (!player) return;
    setIsBanning(true);
    const reason = prompt("Raison du bannissement :");
    if (reason) {
      const { error } = await supabase.from('profiles').update({ is_banned: true, ban_reason: reason }).eq('id', player.id);
      if (error) {
        toast.error("Erreur lors du bannissement.");
      } else {
        toast.success("Joueur banni.");
        onPlayerUpdate();
      }
    }
    setIsBanning(false);
  };

  const handleUnban = async () => {
    if (!player) return;
    setIsUnbanning(true);
    const { error } = await supabase.from('profiles').update({ is_banned: false, ban_reason: null }).eq('id', player.id);
    if (error) {
      toast.error("Erreur lors du débannissement.");
    } else {
      toast.success("Joueur débanni.");
      onPlayerUpdate();
    }
    setIsUnbanning(false);
  };

  const handleUpdateBaseLocation = async () => {
    if (!selectedZoneId || !player) return;

    const { error } = await supabase
      .from('player_states')
      .update({ base_zone_id: parseInt(selectedZoneId, 10) })
      .eq('id', player.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour de la base.");
      console.error(error);
    } else {
      toast.success("La base du joueur a été déplacée.");
      fetchPlayerDetails();
      setIsEditingBase(false);
    }
  };

  if (!player) return null;

  const playerState = details?.playerState;
  const currentLocation = playerState ? `${playerState.position_x}, ${playerState.position_y}` : 'N/A';
  
  const baseZone = zones.find(z => z.id === playerState?.base_zone_id);
  const baseLocationText = baseZone 
    ? `${baseZone.type} (${baseZone.x}, ${baseZone.y})`
    : (playerState?.base_position_x !== null ? `(${playerState.base_position_x}, ${playerState.base_position_y})` : "Non définie");

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du joueur: {player.username || 'N/A'}</DialogTitle>
            <DialogDescription>ID: {player.id}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span>Position: {loadingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">{currentLocation}</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-gray-400" />
              {isEditingBase ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Select onValueChange={setSelectedZoneId} value={selectedZoneId ?? undefined}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Choisir une nouvelle base" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.id.toString()}>
                          {zone.type} ({zone.x}, {zone.y})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleUpdateBaseLocation}>Sauvegarder</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingBase(false)}>Annuler</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Base: {loadingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">{baseLocationText}</span>}</span>
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setIsEditingBase(true)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {player.is_banned ? (
                <Badge variant="destructive" className="flex items-center gap-2">
                  <ShieldBan className="w-4 h-4" />
                  Banni
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Actif
                </Badge>
              )}
              {player.is_banned && <span className="text-sm text-gray-500">Raison: {player.ban_reason}</span>}
            </div>
            {loadingDetails ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : playerState ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <Progress value={playerState.vie} className="w-full" />
                  <span className="font-mono text-sm">{playerState.vie}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-yellow-500" />
                  <Progress value={playerState.faim} className="w-full" />
                  <span className="font-mono text-sm">{playerState.faim}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <GlassWater className="w-5 h-5 text-blue-500" />
                  <Progress value={playerState.soif} className="w-full" />
                  <span className="font-mono text-sm">{playerState.soif}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className="w-5 h-5 text-green-500" />
                  <Progress value={playerState.energie} className="w-full" />
                  <span className="font-mono text-sm">{playerState.energie}%</span>
                </div>
              </div>
            ) : (
              <p>Pas de données d'état pour ce joueur.</p>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <div>
              {player.is_banned ? (
                <Button onClick={handleUnban} disabled={isUnbanning} variant="outline">
                  {isUnbanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Débannir
                </Button>
              ) : (
                <Button onClick={handleBan} disabled={isBanning} variant="destructive">
                  {isBanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Bannir
                </Button>
              )}
            </div>
            <Button onClick={() => setIsInventoryOpen(true)} disabled={!details}>Voir l'inventaire</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {details && (
        <InventoryModal
          isOpen={isInventoryOpen}
          onClose={() => setIsInventoryOpen(false)}
          inventory={details.inventory}
          player={player}
          unlockedSlots={details.playerState.unlocked_slots}
          onInventoryChange={fetchPlayerDetails}
        />
      )}
    </>
  );
}