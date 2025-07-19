import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Coins, Gavel, Clock, ArrowLeft, Dice5 } from 'lucide-react';
import ItemIcon from './ItemIcon';
import { useGame } from '@/contexts/GameContext';
import CreditsInfo from './CreditsInfo';
import ActionModal from './ActionModal';
import { Card, CardHeader, CardTitle } from "./ui/card";
import LootboxSpinner from "./LootboxSpinner";
import { useAuth } from '@/contexts/AuthContext';

// --- Types ---
interface Auction {
  id: number;
  ends_at: string;
  item_id: number;
  item_quantity: number;
  description: string;
  items: { name: string; icon: string | null };
  auction_bids: { amount: number; player_id: string }[];
}

interface CasinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
  zoneName: string;
}

// --- Sub-components ---
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

// --- Main Component ---
const CasinoModal = ({ isOpen, onClose, credits, onUpdate, onPurchaseCredits, zoneName }: CasinoModalProps) => {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<'lobby' | 'roulette' | 'auction'>('lobby');
  
  // States for Roulette
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<{ winnings: number; label: string } | null>(null);
  const [spinningResult, setSpinningResult] = useState<{ winnings: number; label: string } | null>(null);
  const [betAmount, setBetAmount] = useState(10);

  // States for Auction
  const { getIconUrl } = useGame();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmountAuction, setBidAmountAuction] = useState('');
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; description: React.ReactNode; variant?: "default" | "destructive" }>({ isOpen: false, onConfirm: () => {}, title: '', description: '' });

  useEffect(() => {
    if (!isOpen) {
      // Reset all states on close
      setTimeout(() => {
        setActiveGame('lobby');
        setIsSpinning(false);
        setRouletteResult(null);
        setSpinningResult(null);
        setBetAmount(10);
        setSelectedAuction(null);
        setBidAmountAuction('');
      }, 200);
    }
  }, [isOpen]);

  // --- Roulette Logic ---
  const handlePlayRoulette = async () => {
    if (credits < betAmount) {
      showError(`Crédits insuffisants pour parier ${betAmount}.`);
      return;
    }
    setIsSpinning(true);
    setRouletteResult(null);
    setSpinningResult(null);
    try {
      const { data, error } = await supabase.rpc('play_casino_game', { p_bet_amount: betAmount });
      if (error) throw new Error(error.message);
      setSpinningResult(data);
    } catch (error: any) {
      showError(`Erreur au casino: ${error.message}`);
      setIsSpinning(false);
    }
  };

  const handleSpinEnd = () => {
    setRouletteResult(spinningResult);
    setIsSpinning(false);
    onUpdate();
  };

  // --- Auction Logic ---
  const fetchAuctions = useCallback(async () => {
    setLoadingAuctions(true);
    const { data, error } = await supabase
      .from('auctions')
      .select('*, items(name, icon), auction_bids(amount, player_id)')
      .eq('status', 'active');
      
    if (error) showError("Impossible de charger les enchères.");
    else setAuctions(data as Auction[]);
    setLoadingAuctions(false);
  }, []);

  useEffect(() => {
    if (isOpen && activeGame === 'auction') {
      fetchAuctions();
    }
  }, [isOpen, activeGame, fetchAuctions]);

  const handlePlaceBid = async () => {
    if (!selectedAuction || !user) return;
    const amount = parseInt(bidAmountAuction, 10);
    if (isNaN(amount) || amount <= 0) {
      showError("Montant invalide.");
      return;
    }

    const { error } = await supabase.rpc('place_or_update_bid', {
      p_auction_id: selectedAuction.id,
      p_amount: amount,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Enchère mise à jour !");
      onUpdate();
      fetchAuctions();
      setSelectedAuction(null);
      setBidAmountAuction('');
    }
  };

  // --- Render Logic ---
  const renderHeader = () => {
    const title = activeGame === 'roulette' ? 'La Roulette' : activeGame === 'auction' ? 'Encan du Bric-à-Brac' : zoneName;
    const Icon = activeGame === 'roulette' ? Dice5 : activeGame === 'auction' ? Gavel : Coins;
    return (
      <DialogHeader className="text-center">
        {activeGame !== 'lobby' && (
          <Button variant="ghost" size="icon" onClick={() => setActiveGame('lobby')} className="absolute left-4 top-4">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Icon className="w-10 h-10 mx-auto text-white mb-2" />
        <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">{title}</DialogTitle>
        <DialogDescription asChild>
          <CreditsInfo credits={credits} onClick={onPurchaseCredits} />
        </DialogDescription>
      </DialogHeader>
    );
  };

  const renderContent = () => {
    switch (activeGame) {
      case 'roulette':
        const betOptions = [10, 50, 100, 500];
        return (
          <>
            <div className="py-4 space-y-4">
              <div className="h-32 w-full bg-black/20 rounded-lg relative overflow-hidden">
                {isSpinning && spinningResult ? <LootboxSpinner resultLabel={spinningResult.label} onSpinEnd={handleSpinEnd} />
                : rouletteResult ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-lg">Vous avez gagné</p>
                    <p className="text-4xl font-bold text-yellow-400 animate-pulse">{rouletteResult.winnings} crédits</p>
                    <p className="text-sm text-gray-400">({rouletteResult.label})</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400"><p>Placez votre pari pour lancer la roue.</p></div>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-center">Montant du pari :</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {betOptions.map((amount) => (
                    <Button key={amount} variant={betAmount === amount ? "default" : "outline"} onClick={() => setBetAmount(amount)} disabled={isSpinning} className="flex-1">{amount}</Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePlayRoulette} disabled={isSpinning || credits < betAmount} className="w-full bg-green-600 hover:bg-green-700">
                {isSpinning ? <Loader2 className="w-5 h-5 animate-spin" /> : `Parier ${betAmount} crédits`}
              </Button>
            </DialogFooter>
          </>
        );
      case 'auction':
        return (
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-3">
            {loadingAuctions ? <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
            : auctions.length > 0 ? auctions.map(auction => {
              const userBid = auction.auction_bids.find(b => b.player_id === user?.id)?.amount;
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
                  <div className="text-center flex-shrink-0">
                    {userBid && (
                      <p className="text-xs text-gray-400 mb-1">
                        Votre enchère: <span className="font-bold text-yellow-400">{userBid}</span>
                      </p>
                    )}
                    <Button size="sm" onClick={() => {
                      setSelectedAuction(auction);
                      setBidAmountAuction(userBid ? String(userBid) : '');
                    }}>
                      {userBid ? "Modifier" : "Enchérir"}
                    </Button>
                  </div>
                </div>
              )
            }) : <p className="text-center text-gray-400">Aucune enchère en cours.</p>}
          </div>
        );
      case 'lobby':
      default:
        return (
          <div className="py-4 space-y-4">
            <p className="text-center text-gray-300">Faites vos jeux ! Choisissez une table pour commencer.</p>
            <Card onClick={() => setActiveGame('roulette')} className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                <Dice5 className="w-8 h-8 text-white" />
                <div><CardTitle className="text-lg">La Roulette</CardTitle><p className="text-sm text-gray-400">Tentez votre chance pour multiplier votre mise.</p></div>
              </CardHeader>
            </Card>
            <Card onClick={() => setActiveGame('auction')} className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                <Gavel className="w-8 h-8 text-white" />
                <div><CardTitle className="text-lg">Encan du Bric-à-Brac</CardTitle><p className="text-sm text-gray-400">Enchérissez à l'aveugle sur des colis mystères.</p></div>
              </CardHeader>
            </Card>
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          {renderHeader()}
          {renderContent()}
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
              <Input type="number" placeholder="Votre mise" value={bidAmountAuction} onChange={(e) => setBidAmountAuction(e.target.value)} className="pl-8" />
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

export default CasinoModal;