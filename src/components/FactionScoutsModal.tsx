import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Eye, Send, FileText, Coins, Check, ChevronsUpDown, Shield, MapPin, Users, Star, Trash2 } from 'lucide-react';
import { ScoutingMission } from '@/types/game';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import ActionModal from './ActionModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from './ui/input';
import CreditsInfo from './CreditsInfo';
import CountdownTimer from './CountdownTimer'; // Import the new component

interface FactionScoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  scoutingMissions: {
    inProgress: ScoutingMission[];
    completed: ScoutingMission[];
  };
  loading: boolean;
  refreshScoutingData: () => void;
  onPurchaseCredits: () => void;
}

type ScoutablePlayer = { id: string; username: string };

const SCOUT_COST = 1000;
const SCOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

const FactionScoutsModal = ({ isOpen, onClose, credits, onUpdate, scoutingMissions, loading, refreshScoutingData, onPurchaseCredits }: FactionScoutsModalProps) => {
  const [activeTab, setActiveTab] = useState('send');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [scoutablePlayers, setScoutablePlayers] = useState<ScoutablePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutablePlayer | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [sendScoutLoading, setSendScoutLoading] = useState(false);
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; description: string; variant?: "default" | "destructive" }>({ isOpen: false, onConfirm: () => {}, title: '', description: '', variant: 'default' });
  const [reportSearchTerm, setReportSearchTerm] = useState('');

  const { inProgress: inProgressMissions, completed: completedMissions } = scoutingMissions;

  const fetchScoutablePlayers = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_scoutable_players');
    if (error) console.error("Erreur de chargement des joueurs:", error.message);
    else setScoutablePlayers(data || []);
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'send' && scoutablePlayers.length === 0) {
      fetchScoutablePlayers();
    }
  }, [isOpen, activeTab, scoutablePlayers.length, fetchScoutablePlayers]);

  const handleSendScout = async () => {
    if (!selectedPlayer) return;
    setActionModal({ ...actionModal, isOpen: false });
    setSendScoutLoading(true);
    const { error } = await supabase.rpc('send_scout', { p_target_player_id: selectedPlayer.id });
    setSendScoutLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Éclaireur envoyé vers la base de ${selectedPlayer.username} !`);
      onUpdate();
      setSelectedPlayer(null);
      setIsSendModalOpen(false);
    }
  };

  const confirmSendScout = () => {
    if (!selectedPlayer) return;
    setActionModal({ isOpen: true, onConfirm: handleSendScout, title: 'Confirmer la mission', description: `Envoyer un éclaireur vers la base de ${selectedPlayer?.username} pour ${SCOUT_COST} crédits ?`, variant: 'default' });
  };

  const handleToggleFavorite = async (mission: ScoutingMission) => {
    const { error } = await supabase.from('scouting_missions').update({ is_favorite: !mission.is_favorite }).eq('id', mission.id);
    if (error) showError("Erreur lors de la mise à jour du favori.");
    else onUpdate();
  };

  const handleDeleteReport = async (missionId: number) => {
    setActionModal({ ...actionModal, isOpen: false });
    const { error } = await supabase.from('scouting_missions').delete().eq('id', missionId);
    if (error) showError("Erreur lors de la suppression du rapport.");
    else {
      showSuccess("Rapport supprimé.");
      onUpdate();
    }
  };

  const openDeleteModal = (mission: ScoutingMission) => {
    setActionModal({
      isOpen: true,
      onConfirm: () => handleDeleteReport(mission.id),
      title: 'Supprimer le rapport',
      description: `Êtes-vous sûr de vouloir supprimer le rapport concernant ${mission.target_username} ?`,
      variant: 'destructive',
    });
  };

  const filteredAndSortedReports = useMemo(() => {
    return completedMissions
      .filter(mission => mission.report_data?.target_username.toLowerCase().includes(reportSearchTerm.toLowerCase()))
      .sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      });
  }, [completedMissions, reportSearchTerm]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-sonner-toast]')) {
              e.preventDefault();
            }
          }}
          className="sm:max-w-3xl lg:max-w-4xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col h-full sm:h-[85vh] sm:max-h-[85vh]"
        >
          <DialogHeader className="text-center flex-shrink-0">
            <Eye className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Faction: Éclaireurs</DialogTitle>
            <DialogDescription asChild>
              <CreditsInfo credits={credits} onClick={onPurchaseCredits} />
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-grow mt-4 min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="send"><Send className="w-4 h-4 mr-2" />Envoyer & Suivi</TabsTrigger>
              <TabsTrigger value="reports"><FileText className="w-4 h-4 mr-2" />Rapports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="send" className="flex-grow min-h-0">
              <div className="mt-4 flex flex-col h-full">
                <div className="flex-shrink-0 mb-4">
                  <Button onClick={() => setIsSendModalOpen(true)} className="w-full sm:w-auto">
                    <Send className="w-4 h-4 mr-2" /> Envoyer un nouvel éclaireur
                  </Button>
                </div>
                <div className="flex flex-col gap-4 min-h-0 flex-grow">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white font-mono">Suivi des Éclaireurs</h3>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  <div className="flex-grow overflow-y-auto no-scrollbar space-y-3 pr-2">
                    {inProgressMissions.length > 0 ? (
                      inProgressMissions.map(mission => (
                        <Card key={mission.id} className="bg-white/5 border-white/10">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-300 flex items-center gap-1.5"><Users size={14} /> Cible</span>
                              <span className="font-bold">{mission.target_username}</span>
                            </div>
                            <CountdownTimer endTime={new Date(new Date(mission.started_at).getTime() + SCOUT_DURATION_MS).toISOString()} onComplete={refreshScoutingData} totalDurationMs={SCOUT_DURATION_MS} />
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      !loading && (
                        <div className="text-center text-gray-400 pt-8 h-full flex items-center justify-center">
                          <p>Aucune mission en cours.</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="flex-grow min-h-0">
              <div className="mt-4 flex flex-col h-full">
                <div className="flex-shrink-0 mb-4">
                  <Input
                    placeholder="Rechercher un rapport par pseudo..."
                    value={reportSearchTerm}
                    onChange={(e) => setReportSearchTerm(e.target.value)}
                    className="bg-white/10 border-white/20"
                  />
                </div>
                <div className="flex-grow overflow-y-auto no-scrollbar space-y-3 pr-2">
                  {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}
                  {!loading && filteredAndSortedReports.length === 0 && (
                    <div className="text-center text-gray-400 pt-8 h-full flex items-center justify-center">
                      <p>{completedMissions.length > 0 ? "Aucun rapport ne correspond à votre recherche." : "Aucun rapport disponible."}</p>
                    </div>
                  )}
                  {!loading && filteredAndSortedReports.map(mission => (
                    <Card key={mission.id} className={cn("bg-white/5 border-white/10", mission.is_favorite && "border-yellow-400/50")}>
                      <CardHeader className="p-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Rapport: {mission.report_data?.target_username}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleToggleFavorite(mission)}>
                            <Star className={cn("w-4 h-4", mission.is_favorite ? "text-yellow-400 fill-yellow-400" : "text-gray-500 hover:text-yellow-500")} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteModal(mission)}>
                            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <div className="flex items-center gap-2 text-sm"><Shield size={14} /> Base: <span className="font-bold">{mission.report_data?.base_zone_type}</span></div>
                        <div className="flex items-center gap-2 text-sm"><MapPin size={14} /> Joueur: <span className="font-bold">{mission.report_data?.target_username}</span></div>
                        <Button size="sm" disabled className="w-full mt-2">Attaquer (bientôt)</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-sonner-toast]')) {
              e.preventDefault();
            }
          }}
          className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-white font-mono tracking-wider uppercase">Nouvelle Mission</DialogTitle>
            <DialogDescription className="text-gray-300">Choisissez une cible à espionner.</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center gap-6">
            <select
              value={selectedPlayer?.id || ''}
              onChange={(e) => {
                const player = scoutablePlayers.find(p => p.id === e.target.value);
                setSelectedPlayer(player || null);
              }}
              className="w-full max-w-xs bg-white/5 border border-white/20 rounded-lg px-3 h-10 text-white focus:ring-white/30 focus:border-white/30"
            >
              <option value="" disabled>Sélectionner un joueur...</option>
              {scoutablePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.username}
                </option>
              ))}
            </select>
            <Button onClick={confirmSendScout} disabled={!selectedPlayer || sendScoutLoading || credits < SCOUT_COST} className="w-full max-w-xs">
              {sendScoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <span className="flex items-center justify-center gap-2">
                  Envoyer pour <Coins className="w-4 h-4" /> {SCOUT_COST}
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.title}
        description={actionModal.description}
        actions={[
          { label: "Confirmer", onClick: actionModal.onConfirm, variant: actionModal.variant },
          { label: "Annuler", onClick: () => setActionModal({ ...actionModal, isOpen: false }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default FactionScoutsModal;