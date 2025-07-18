"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Inventory, Map, Home, Banknote, Swords, Users } from 'lucide-react';
import MoreMenu from './MoreMenu'; // Import the new component

interface GameFooterProps {
  onOpenInventory: () => void;
  onOpenMap: () => void;
  onOpenBase: () => void;
  onOpenBank: () => void;
  onOpenMarket: () => void;
  onOpenLeaderboard: () => void;
  onPurchaseCredits: () => void;
}

const GameFooter: React.FC<GameFooterProps> = ({
  onOpenInventory,
  onOpenMap,
  onOpenBase,
  onOpenBank,
  onOpenMarket,
  onOpenLeaderboard,
  onPurchaseCredits,
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm p-2 border-t border-gray-700 z-50">
      <div className="flex flex-col md:flex-row justify-around items-center w-full max-w-7xl mx-auto gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenInventory}
            className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
          >
            <Inventory className="h-5 w-5" />
            <span className="hidden sm:inline">Inventaire</span>
          </Button>
          {/* New MoreMenu button */}
          <MoreMenu />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenMap}
            className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
          >
            <Map className="h-5 w-5" />
            <span className="hidden sm:inline">Carte</span>
          </Button>
          <Button
            onClick={onOpenBase}
            className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">Base</span>
          </Button>
          <Button
            onClick={onOpenBank}
            className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
          >
            <Banknote className="h-5 w-5" />
            <span className="hidden sm:inline">Banque</span>
          </Button>
          <Button
            onClick={onOpenMarket}
            className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
          >
            <Swords className="h-5 w-5" />
            <span className="hidden sm:inline">Marché</span>
          </Button>
          <Button
            onClick={onOpenLeaderboard}
            className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
          >
            <Users className="h-5 w-5" />
            <span className="hidden sm:inline">Classement</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onPurchaseCredits}
            className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
          >
            <Banknote className="h-5 w-5" />
            <span className="hidden sm:inline">Acheter des crédits</span>
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default GameFooter;