import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dice5, Palette, Gem } from 'lucide-react';
import CreditsInfo from './CreditsInfo';
import WagerWheelGame from './casino/WagerWheelGame';
import ColorRouletteGame from './casino/ColorRouletteGame';

interface CasinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
}

const CasinoModal = ({ isOpen, onClose, credits, onUpdate, onPurchaseCredits }: CasinoModalProps) => {
  const [currentGame, setCurrentGame] = useState<'wager_wheel' | 'color_roulette' | null>(null);

  const renderGameMenu = () => (
    <div className="py-4 space-y-3">
      <Button onClick={() => setCurrentGame('wager_wheel')} className="w-full justify-start gap-3 h-14 text-base">
        <Gem className="w-6 h-6" /> Wager Wheel
      </Button>
      <Button onClick={() => setCurrentGame('color_roulette')} className="w-full justify-start gap-3 h-14 text-base">
        <Palette className="w-6 h-6" /> Roulette de Couleur
      </Button>
    </div>
  );

  const renderGame = () => {
    switch (currentGame) {
      case 'wager_wheel':
        return <WagerWheelGame credits={credits} onUpdate={onUpdate} onBack={() => setCurrentGame(null)} />;
      case 'color_roulette':
        return <ColorRouletteGame credits={credits} onUpdate={onUpdate} onBack={() => setCurrentGame(null)} />;
      default:
        return renderGameMenu();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setCurrentGame(null); } }}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
      >
        <DialogHeader className="text-center">
          <Dice5 className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Casino</DialogTitle>
          <DialogDescription className="sr-only">Tentez votre chance !</DialogDescription>
          <CreditsInfo credits={credits} className="mt-1" onClick={onPurchaseCredits} />
        </DialogHeader>
        {renderGame()}
      </DialogContent>
    </Dialog>
  );
};

export default CasinoModal;