import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Eye, Send, FileText, Coins, Check, ChevronsUpDown, Shield, MapPin, Clock } from 'lucide-react';
import { ScoutingMission } from '@/types/game';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import ActionModal from './ActionModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FactionScoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
}

type ScoutablePlayer = { id: string; username: string };

const SCOUT_COST = 1000;
const SCOUT_DURATION_MS = 30 * 60 * 1000;

const Countdown = ({ endTime }: { endTime: string }) => {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Terminé');
        clearInterval(interval);
        return;
      }
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setRemaining(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return <span className="font-mono">{remaining}</span>;
};

const FactionScoutsModal = ({ isOpen, onClose, credits, onUpdate }: FactionScoutsModalProps) => {
  const [activeTab, setActiveTab] = useState('send');
  const [missions, setMissions] = useState<ScoutingMission[]>([]);
  const [scoutablePlayers, setScoutablePlayers] = useState<ScoutablePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutablePlayer | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionModal, setActionModal] = useState({ isOpen: false, onConfirm: () => {} });

  const fetchScoutingData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('check_and_get_scouting_data');
    if (error) showError("Erreur de chargement des missions.");
    else setMissions(data || []);
    setLoading(false);
  }, []);

  const fetchScoutablePlayers = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_scoutable_players');
    if (error) showError("Erreur de chargement des joueurs.");
    else setScoutablePlayers(data || []);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchScoutingData();
      fetchScoutablePlayers();
      const interval = setInterval(fetchScoutingData, 15000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchScoutingData, fetchScoutablePlayers]);

  const handleSendScout = async () => {
    if (!selectedPlayer) return;
    setActionModal({ isOpen: false, onConfirm: () => {} });
    setLoading(true);
    const { error } = await supabase.rpc('send_scout', { p_target_player_id: selectedPlayer.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Éclaireur envoyé vers la base de ${selectedPlayer.username} !`);
      onUpdate();
      fetchScoutingData();
      setSelectedPlayer(null);
    }
    setLoading(false);
  };

  const confirmSendScout = () => {
    if (!selectedPlayer) return;
    setActionModal({ isOpen: true, onConfirm: handleSendScout });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col max-h-[85vh]">
          <DialogHeader className="text-center flex-shrink-0">
            <Eye className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Faction: Éclaireurs</DialogTitle>
            <DialogDescription className="flex items-center justify-center gap-2 text-yellow-400 font-mono">
              <Coins className="w-4 h-4" /> {credits} crédits
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-grow mt-4 min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="send"><Send className="w-4 h-4 mr-2" />Envoyer</TabsTrigger>
              <TabsTrigger value="reports"><FileText className="w-4 h-4 mr-2" />Rapports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="send" className="mt-4 flex-grow min-h-0 flex flex-col">
              <div className="flex-grow p-4 bg-white/5 rounded-lg border border-white/10 flex flex-col justify-center items-center text-center">
                <p className="text-sm text-gray-300 mb-4">Choisissez une cible à explorer. Chaque mission coûte {SCOUT_COST} crédits et dure 30 minutes.</p>
                <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full max-w-xs justify-between bg-white/5 border-white/20">
                      {selectedPlayer ? selectedPlayer.username : "Sélectionner un joueur..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Rechercher un joueur..." />
                      <CommandList>
                        <CommandEmpty>Aucun joueur trouvé.</CommandEmpty>
                        <CommandGroup>
                          {scoutablePlayers.map((player) => (
                            <CommandItem key={player.id} value={player.username} onSelect={() => { setSelectedPlayer(player); setIsComboboxOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", selectedPlayer?.id === player.id ? "opacity-100" : "opacity-0")} />
                              {player.username}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={confirmSendScout} disabled={!selectedPlayer || loading || credits < SCOUT_COST} className="w-full mt-4">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Envoyer un éclaireur`}
              </Button>
            </TabsContent>

            <TabsContent value="reports" className="mt-4 flex-grow min-h-0 overflow-y-auto no-scrollbar">
              <div className="space-y-3">
                {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}
                {!loading && missions.length === 0 && <p className="text-center text-gray-400 py-8">Aucune mission en cours ou terminée.</p>}
                {!loading && missions.map(mission => (
                  <Card key={mission.id} className="bg-white/5 border-white/10">
                    <CardHeader className="p-4">
                      <CardTitle className="text-base">
                        {mission.status === 'in_progress' ? 'Mission en cours' : 'Rapport terminé'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">Cible:</span>
                        <span className="font-bold">{mission.target_username}</span>
                      </div>
                      {mission.status === 'in_progress' ? (
                        <>
                          <Progress value={(Date.now() - new Date(mission.started_at).getTime()) / SCOUT_DURATION_MS * 100} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Progression</span>
                            <Countdown endTime={new Date(new Date(mission.started_at).getTime() + SCOUT_DURATION_MS).toISOString()} />
                          </div>
                        </>
                      ) : (
                        <div className="text-sm space-y-2 pt-2 border-t border-white/10">
                          <div className="flex items-center gap-2"><Shield size={14} /> Base: <span className="font-bold">{mission.report_data?.base_zone_type}</span></div>
                          <div className="flex items-center gap-2"><MapPin size={14} /> Joueur: <span className="font-bold">{mission.report_data?.target_username}</span></div>
                          <Button size="sm" disabled className="w-full mt-2">Attaquer (bientôt)</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <ActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title="Confirmer la mission"
        description={`Envoyer un éclaireur vers la base de ${selectedPlayer?.username} pour ${SCOUT_COST} crédits ?`}
        actions={[
          { label: "Confirmer", onClick: actionModal.onConfirm, variant: "default" },
          { label: "Annuler", onClick: () => setActionModal({ ...actionModal, isOpen: false }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default FactionScoutsModal;