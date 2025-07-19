import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Coins, Gavel, Clock, ArrowLeft } from 'lucide-react';
import ItemIcon from './ItemIcon';
import { useGame } from '@/contexts/GameContext';
import CreditsInfo from './CreditsInfo';
import ActionModal from './ActionModal';

interface Auction {
  id: number;
  ends_at: string;
  item_id: number;
  item_quantity: number;
  description: string;
  items: { name: string; icon: string | null };
  auction_bids: { amount: number }[];
}

interface AuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
  zoneName: string;
  onBackToLobby: () => void;
}

const Countdown = ({ endTime }: { endTime: string }) => {
  const calculateRemaining = useCallback(() => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "Terminé";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [endTime]);

  const [remaining, setRemaining] = useState(calculateRemaining());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(calculateRemaining()), 60000);
    return () => clearInterval(interval);
  }, [calculateRemaining]);

  return <span className="font-mono">{remaining}</span>;
};

const AuctionModal = ({ isOpen, onClose, credits, onUpdate, onPurchaseCredits, zoneName, onBackToLobby }: AuctionModalProps) => {
  const { getIconUrl } = useGame();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState('');

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('auctions')
      .select('*, items(name, icon), auction_bids(amount)')
      .eq('status', 'active');
    
    if (error) showError("Impossible de charger les enchères.");
    else setAuctions(data as Auction[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchAuctions();
  }, [isOpen, fetchAuctions]);

  const handlePlaceBid = async () => {
    if (!selectedAuction) return;
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showError("Montant invalide.");
      return;
    }
    if (credits < amount) {
      showError("Crédits insuffisants.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('auction_bids').insert({ auction_id: selectedAuction.id, amount });
    if (error) {
      showError(error.message.includes('duplicate key') ? "Vous avez déjà enchéri sur cet objet." : "Erreur lors de la mise.");
    } else {
      showSuccess("Enchère placée !");
      onUpdate();
      fetchAuctions();
      setSelectedAuction(null);
      setBidAmount('');
    }
    setLoading(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={onBackToLobby} className="absolute left-4 top-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="text-center w-full">
                <Gavel className="w-10 h-10 mx-auto text-white mb-2" />
                <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">{zoneName}</DialogTitle>
                <DialogDescription asChild>
                  <CreditsInfo credits={credits} onClick={onPurchaseCredits} />
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-3">
            {loading ? <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
            : auctions.length > 0 ? auctions.map(auction => {
              const userBid = auction.auction_bids[0]?.amount;
              return (
                <div key={auction.id} className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                    <ItemIcon iconName={getIconUrl(auction.items.icon) || auction.items.icon} alt={auction.items.name} />
                  </div>
                  <div className="flex-grow">
                    <p className="font-bold">{auction.items.name} x{auction.item_quantity}</p>
                    <p className="text-xs text-gray-400">{auction.description}</p>
                    <p className="text-xs text-gray-300 flex items-center gap-1 mt-1"><Clock size={12} /> <Countdown endTime={auction.ends_at} /></p>
                  </div>
                  {userBid ? (
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Votre enchère</p>
                      <p className="font-bold text-yellow-400">{userBid}</p>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setSelectedAuction(auction)}>Enchérir</Button>
                  )}
                </div>
              )
            }) : <p className="text-center text-gray-400">Aucune enchère en cours.</p>}
          </div>
        </DialogContent>
      </Dialog>
      <ActionModal
        isOpen={!!selectedAuction}
        onClose={() => setSelectedAuction(null)}
        title={`Enchérir sur ${selectedAuction?.items.name}`}
        description={
          <div className="space-y-2 mt-4 text-left">
            <p className="text-sm text-gray-300">Votre enchère est secrète. Le plus offrant à la fin du temps imparti remporte l'objet. Toutes les mises sont conservées par la maison.</p>
            <div className="relative">
              <Input type="number" placeholder="Votre mise" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="pl-8" />
              <Coins className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
            </div>
          </div>
        }
        actions={[
          { label: "Confirmer l'enchère", onClick: handlePlaceBid, variant: "default" },
          { label: "Annuler", onClick: () => setSelectedAuction(null), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default AuctionModal;