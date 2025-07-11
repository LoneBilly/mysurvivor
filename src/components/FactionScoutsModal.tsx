import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Eye, Send, FileText, Coins, Check, ChevronsUpDown, Shield } from 'lucide-react';
import { ScoutingMission } from '@/types/game';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import ActionModal from './ActionModal';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FactionScoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
}

type ScoutablePlayer = { id: string; username: string };

const SCOUT_COST = 1000;
const SCOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const MissionTimer = ({ startTime, onFinish }: { startTime: string, onFinish: () => void }) => {
  const [remaining, setRemaining] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const endTime = new Date(startTime).getTime() + SCOUT_DURATION_MS;
      const now = Date.now();
      const timeLeft = endTime - now;

      if (timeLeft <= 0) {
        setRemaining('Terminé');
        setProgress(100);
        onFinish();
        return true;
      } else {
        setRemaining(formatDistanceToNowStrict(endTime, { locale: fr, addSuffix: false }));
        setProgress(((SCOUT_DURATION_MS - timeLeft) / SCOUT_DURATION_MS) * 100);
        return false;
      }
    };

    if (calculateTime()) return;

    const interval = setInterval(() => {
      if (calculateTime()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, onFinish]);

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
        <span>Progression</span>
        <span className="font-mono">{remaining}</span>
      </div>
      <Progress value={progress} className="h-2 bg-white/10" indicatorClassName="bg-sky-400" />
    </div>
  );
};

const FactionScoutsModal = ({ isOpen, onClose, credits, onUpdate }: FactionScoutsModalProps) => {
  const [missions, setMissions] = useState<ScoutingMission[]>([]);
  const [scoutablePlayers, setScoutablePlayers] = useState<ScoutablePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutablePlayer | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionModal, setActionModal] = useState({ isOpen: false, onConfirm: () => {} });

  const fetchScoutingData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('check_and_get_scouting_data');
    if (error) {
      showError("Erreur de chargement des missions.");
      console.error(error);
    } else {
      setMissions(data || []);
    }
    setLoading(false);
  }, []);

  const fetchScoutablePlayers = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_scoutable_players');
    if (error) {
      showError("Erreur de chargement des joueurs.");
      console.error(error);
    } else {
      setScoutablePlayers(data || []);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchScoutingData();
      fetchScoutablePlayers();
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col max-h-[85vh]">
          <DialogHeader className="text-center flex-shrink-0">
            <Eye className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Faction: Éclaireurs</DialogTitle>
            <DialogDescription>Envoyez des éclaireurs et consultez vos rapports.</DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 flex-shrink-0">
            <h3 className="font-bold text-lg mb-3 text-white">Lancer une nouvelle mission</h3>
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between bg-white/5 border-white/20 hover:bg-white/10 hover:text-white">
                  {selectedPlayer ? selectedPlayer.username : "Sélectionner un joueur..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un joueur..." />
                  <CommandList>
                    <CommandEmpty>Aucun joueur à explorer.</CommandEmpty>
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
            <Button onClick={confirmSendScout} disabled={!selectedPlayer || loading || credits < SCOUT_COST} className="w-full mt-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <div className="flex items-center gap-2">
                  <Send size={16} />
                  <span>Envoyer l'éclaireur</span>
                  <div className="w-px h-4 bg-white/20 mx-1"></div>
                  <span className="flex items-center gap-1">{SCOUT_COST} <Coins size={14} /></span>
                </div>
              )}
            </Button>
          </div>

          <div className="mt-4 flex-grow overflow-y-auto no-scrollbar space-y-3">
            <h3 className="font-bold text-lg text-white sticky top-0 bg-slate-800/70 backdrop-blur-sm py-2 z-10">Missions & Rapports</h3>
            {loading ? (
              <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : missions.length === 0 ? (
              <div className="text-center text-gray-400 py-8">Aucune mission en cours ou terminée.</div>
            ) : (
              missions.map(mission => (
                <div key={mission.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  {mission.status === 'in_progress' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                        <p className="font-semibold">En exploration: <span className="font-bold text-white">{mission.target_username}</span></p>
                      </div>
                      <MissionTimer startTime={mission.started_at} onFinish={fetchScoutingData} />
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-green-400 flex items-center gap-2"><FileText size={16} /> Rapport disponible</p>
                          <p className="font-bold text-lg text-white mt-1">{mission.report_data?.target_username}</p>
                        </div>
                        <Button size="sm" disabled>Attaquer</Button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm">
                        <p className="flex items-center gap-2 text-gray-300"><Shield size={14} /> Base en zone: <span className="font-bold text-white">{mission.report_data?.base_zone_type}</span></p>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
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