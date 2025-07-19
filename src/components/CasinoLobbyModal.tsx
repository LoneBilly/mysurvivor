import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dice5, Gavel, Coins } from 'lucide-react';
import CreditsInfo from './CreditsInfo';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface CasinoLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onPurchaseCredits: () => void;
  zoneName: string;
  onOpenRoulette: () => void;
  onOpenAuction: () => void;
}

const CasinoLobbyModal = ({ isOpen, onClose, credits, onPurchaseCredits, zoneName, onOpenRoulette, onOpenAuction }: CasinoLobbyModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Coins className="w-10 h-10 mx-auto text-yellow-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">{zoneName}</DialogTitle>
          <DialogDescription asChild>
            <CreditsInfo credits={credits} onClick={onPurchaseCredits} />
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-center text-gray-300">Faites vos jeux ! Choisissez une table pour commencer.</p>
          
          <Card onClick={onOpenRoulette} className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
              <Dice5 className="w-8 h-8 text-white" />
              <div>
                <CardTitle className="text-lg">La Roulette</CardTitle>
                <p className="text-sm text-gray-400">Tentez votre chance pour multiplier votre mise.</p>
              </div>
            </CardHeader>
          </Card>

          <Card onClick={onOpenAuction} className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
              <Gavel className="w-8 h-8 text-white" />
              <div>
                <CardTitle className="text-lg">Encan du Bric-à-Brac</CardTitle>
                <p className="text-sm text-gray-400">Enchérissez à l'aveugle sur des colis mystères.</p>
              </div>
            </CardHeader>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CasinoLobbyModal;