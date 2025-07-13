import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { Handcuffs, Coins, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

type ScoutablePlayer = { id: string; username: string };

interface BountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBountyPlaced: (targetId: string, amount: number) => void;
  loading: boolean;
}

const BountyModal = ({ isOpen, onClose, onBountyPlaced, loading }: BountyModalProps) => {
  const [players, setPlayers] = useState<ScoutablePlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [fetchingPlayers, setFetchingPlayers] = useState(false);

  const fetchPlayers = useCallback(async () => {
    setFetchingPlayers(true);
    const { data, error } = await supabase.rpc('get_scoutable_players');
    if (error) {
      showError("Impossible de charger la liste des joueurs.");
    } else {
      setPlayers(data || []);
    }
    setFetchingPlayers(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen, fetchPlayers]);

  const handlePlaceBounty = () => {
    const bountyAmount = parseInt(amount, 10);
    if (selectedPlayerId && !isNaN(bountyAmount) && bountyAmount > 0) {
      onBountyPlaced(selectedPlayerId, bountyAmount);
    } else {
      showError("Veuillez sélectionner un joueur et entrer un montant valide.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Handcuffs className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Commissariat</DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Mettez une prime sur la tête d'un autre survivant.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">Cible</label>
            {fetchingPlayers ? <Loader2 className="w-5 h-5 animate-spin mt-2" /> : (
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="w-full bg-white/5 border-white/20 mt-1">
                  <SelectValue placeholder="Choisissez un joueur..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Montant de la prime</label>
            <div className="relative mt-1">
              <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="bg-white/10 border-white/20 pl-3 pr-8" />
              <Coins className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <Button onClick={handlePlaceBounty} disabled={loading || fetchingPlayers || !selectedPlayerId || !amount} className="w-full">
            {loading ? 'Placement en cours...' : 'Placer la prime'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BountyModal;