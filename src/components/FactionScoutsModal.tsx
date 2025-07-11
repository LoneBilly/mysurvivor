import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Eye, Send, FileText, Coins, Check, ChevronsUpDown } from 'lucide-react';
import { ScoutingMission } from '@/types/game';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import ActionModal from './ActionModal';

interface FactionScoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
}

type ScoutablePlayer = { id: string; username: string };

const SCOUT_COST = 1000;
const SCOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

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
      const interval = setInterval(fetchScoutingData, 15000); // Refresh every 15s
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
    setActionModal({
      isOpen: true,
      onConfirm: handleSendScout,
    });
  };

  const MissionProgress = ({ mission }: { mission: ScoutingMission }) => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
      const calculateProgress = () => {
        const elapsed = Date.now() - new Date(mission.started_at).getTime();
        const calculatedProgress = Math.min(100, (elapsed / SCOUT_DURATION_MS) * 100);
        setProgress(calculatedProgress);
      };
      calculateProgress();
      const timer = setInterval(calculateProgress, 1000);
      return () => clearInterval(timer);
    }, [mission.started_at]);

    return (
      <div className="p-3 bg-white/5 rounded-lg">
        <p className="text-sm">En exploration: <span className="font-bold">{mission.target_username}</span></p>
        <Progress value={progress} className="mt-2 h-2" />
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader className="text-center">
            <Eye className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Faction: Scouts</DialogTitle>
            <DialogDescription>Envoyez des éclaireurs et consultez vos rapports.</DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="send"><Send className="w-4 h-4 mr-2" />Envoyer</TabsTrigger>
              <TabsTrigger value="reports"><FileText className="w-4 h-4 mr-2" />Rapports</TabsTrigger>
            </TabsList>
            <TabsContent value="send" className="mt-4 space-y-4">
              <p className="text-sm text-gray-300 text-center">Choisissez une cible à explorer. Chaque mission coûte 1000 crédits et dure 30 minutes.</p>
              <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between bg-white/5 border-white/20">
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
                          <CommandItem
                            key={player.id}
                            value={player.username}
                            onSelect={() => {
                              setSelectedPlayer(player);
                              setIsComboboxOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedPlayer?.id === player.id ? "opacity-100" : "opacity-0")} />
                            {player.username}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button onClick={confirmSendScout} disabled={!selectedPlayer || loading || credits < SCOUT_COST} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Envoyer un éclaireur (${SCOUT_COST} crédits)`}
              </Button>
            </TabsContent>
            <TabsContent value="reports" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {loading && <Loader2 className="w-6 h-6 animate-spin mx-auto" />}
              {!loading && missions.length === 0 && <p className="text-center text-gray-400 py-4">Aucune mission en cours ou terminée.</p>}
              {!loading && missions.map(mission => (
                mission.status === 'in_progress' ? (
                  <MissionProgress key={mission.id} mission={mission} />
                ) : (
                  <div key={mission.id} className="p-3 bg-white/10 rounded-lg flex justify-between items-center">
                    <div>
                      <p>Rapport sur: <span className="font-bold">{mission.report_data?.target_username}</span></p>
                      <p className="text-xs text-gray-300">Base en zone: {mission.report_data?.base_zone_type}</p>
                    </div>
                    <Button size="sm" disabled>Attaquer</Button>
                  </div>
                )
              ))}
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