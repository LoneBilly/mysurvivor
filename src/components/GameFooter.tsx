"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import MoreMenuModal from "./MoreMenuModal";
import { Menu } from 'lucide-react';

interface GameFooterProps {
  onOpenInventory: () => void;
  onPurchaseCredits: () => void;
}

const GameFooter: React.FC<GameFooterProps> = ({ onOpenInventory, onPurchaseCredits }) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4 flex justify-between items-center z-50">
      {/* This div is assumed to be the container for main navigation/action buttons */}
      {/* It will now be responsive to position "Inventaire" and "..." correctly */}
      <div className="flex flex-row sm:flex-col items-center gap-2">
        {/* Placeholder for the existing "Inventaire" button.
            In a real scenario, this would be the actual Inventory button component. */}
        <Button
          onClick={onOpenInventory}
          className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
        >
          Inventaire
        </Button>

        {/* The new "..." menu button */}
        <Button
          onClick={() => setIsMoreMenuOpen(true)}
          className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* This is the div from the user's snippet, containing the "Acheter des crédits" button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onPurchaseCredits}
          className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3"
        >
          Acheter des crédits
        </Button>
      </div>

      {/* The modal component */}
      <MoreMenuModal isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} />
    </footer>
  );
};

export default GameFooter;