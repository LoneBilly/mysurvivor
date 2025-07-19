import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Coins, Shield, List, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  zoneName: string;
}

type TargetPlayer = { id: string; username: string };
type ActiveBounty = { placer_username: string; target_username: string; amount: number; created_at: string };

const BountyModal = ({ isOpen, onClose, credits, onUpdate, zoneName }: BountyModalProps) => {
  const [activeTab, setActiveTab] = useState('place');
  const [targetPlayers, setTargetPlayers] = useState<TargetPlayer[]>([]);
  const [activeBounties, setActiveBounties] = useState<ActiveBounty[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<TargetPlayer | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBounties, setLoadingBounties] = useState(false);

  const fetchTargetPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_scoutable_players');
    if (error) {
      showError("Impossible de charger la liste des cibles.");
    } else {
      setTargetPlayers(data || []);
    }
    setLoading(false);
  }, []);

  const fetchActiveBounties = useCallback(async () => {
    setLoadingBounties(true);
    const { data, error } = await supabase.rpc('get_active_bounties');
    if (error) {
      showError("Impossible de charger la liste des primes.");
    } else {
      setActiveBounties(data || []);
    }
    setLoadingBounties(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'place') {
        fetchTargetPlayers();
      } else if (activeTab === 'list') {
        fetchActiveBounties();
      }
    } else {
      setSelectedPlayer(null);
      setAmount('');
    }
  }, [isOpen, activeTab, fetchTargetPlayers, fetchActiveBounties]);

  const handlePlaceBounty = async () => {
    if (!selectedPlayer || !amount) {
      showError("Veuillez sélectionner une cible et un montant.");
      return;
    }
    const bountyAmount = parseInt(amount, 10);
    if (isNaN(bountyAmount) || bountyAmount <= 0) {
      showError("Montant de la prime invalide.");
      return;
    }
    if (credits < bountyAmount) {
      showError("Crédits insuffisants.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('place_bounty', {
      p_target_id: selectedPlayer.id,
      p_amount: bountyAmount,
    });
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Prime de ${bountyAmount} crédits placée sur ${selectedPlayer.username} !`);
      onUpdate();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
      >
        <DialogHeader className="text-center">
          <Shield className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">{zoneName}</DialogTitle>
          <DialogDescription>Placez ou consultez les primes sur la tête des survivants.</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="place"><PlusCircle className="w-4 h-4 mr-2" />Placer une prime</TabsTrigger>
            <TabsTrigger value="list"><List className="w-4 h-4 mr-2" />Primes en cours</TabsTrigger>
          </TabsList>
          <TabsContent value="place" className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-white font-mono">Cible</label>
              <select
                value={selectedPlayer?.id || ''}
                onChange={(e) => {
                  const player = targetPlayers.find(p => p.id === e.target.value);
                  setSelectedPlayer(player || null);
                }}
                className="w-full mt-1 bg-white/5 border border-white/20 rounded-lg px-3 h-10 text-white focus:ring-white/30 focus:border-white/30"
              >
                <option value="" disabled>Sélectionner un joueur...</option>
                {loading && <option disabled>Chargement des joueurs...</option>}
                {!loading && targetPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bounty-amount" className="text-sm font-medium text-white font-mono">Montant de la prime</label>
              <div className="relative mt-1">
                <Input
                  id="bounty-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 bg-white/5 border-white/20"
                  placeholder="0"
                />
                <Coins className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Votre solde: {credits} crédits</p>
            </div>
            <Button onClick={handlePlaceBounty} disabled={loading || !selectedPlayer || !amount} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Placer la prime'}
            </Button>
          </TabsContent>
          <TabsContent value="list" className="mt-4 max-h-80 overflow-y-auto space-y-2">
            {loadingBounties ? (
              <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : activeBounties.length > 0 ? (
              activeBounties.map((bounty, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="font-bold">{bounty.target_username}</p>
                    <p className="text-xs text-gray-400">Par: {bounty.placer_username}</p>
                  </div>
                  <div className="font-bold flex items-center gap-1 text-yellow-400">
                    {bounty.amount} <Coins size={14} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-10">Aucune prime en cours.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BountyModal;