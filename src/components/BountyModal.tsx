import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Coins, Shield } from 'lucide-react';

interface BountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
}

type TargetPlayer = { id: string; username: string };

const BountyModal = ({ isOpen, onClose, credits, onUpdate }: BountyModalProps) => {
  const [targetPlayers, setTargetPlayers] = useState<TargetPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<TargetPlayer | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      fetchTargetPlayers();
    } else {
      setSelectedPlayer(null);
      setAmount('');
    }
  }, [isOpen, fetchTargetPlayers]);

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
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Shield className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Commissariat</DialogTitle>
          <DialogDescription>Placez une prime sur la tête d'un autre survivant.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BountyModal;