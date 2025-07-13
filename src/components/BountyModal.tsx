import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ShieldAlert, Coins, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';

type ScoutablePlayer = { id: string; username: string };

interface BountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
}

const BountyModal = ({ isOpen, onClose, credits, onUpdate }: BountyModalProps) => {
  const [target, setTarget] = useState<ScoutablePlayer | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<ScoutablePlayer[]>([]);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_scoutable_players');
    if (error) showError("Erreur de chargement des joueurs.");
    else setPlayers(data || []);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen, fetchPlayers]);

  const handlePlaceBounty = async () => {
    if (!target || !amount) {
      showError("Veuillez sélectionner une cible et un montant.");
      return;
    }
    const bountyAmount = parseInt(amount, 10);
    if (isNaN(bountyAmount) || bountyAmount <= 0) {
      showError("Montant invalide.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('place_bounty', { p_target_id: target.id, p_amount: bountyAmount });
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Prime placée sur ${target.username} !`);
      onUpdate();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle>Commissariat</DialogTitle>
          <DialogDescription>Mettez une prime sur la tête d'un autre survivant.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 my-4">
          <div>
            <label className="text-sm font-medium">Cible</label>
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
                  {target ? target.username : "Sélectionner un joueur..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un joueur..." />
                  <CommandList>
                    <CommandEmpty>Aucun joueur trouvé.</CommandEmpty>
                    <CommandGroup>
                      {players.map((player) => (
                        <CommandItem key={player.id} value={player.username} onSelect={() => { setTarget(player); setIsComboboxOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", target?.id === player.id ? "opacity-100" : "opacity-0")} />
                          {player.username}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-sm font-medium">Montant de la prime</label>
            <Input type="number" placeholder={`Vos crédits: ${credits}`} value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Button onClick={handlePlaceBounty} disabled={!target || !amount || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Placer la prime"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BountyModal;