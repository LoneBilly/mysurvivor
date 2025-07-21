"use client";

import React from 'react';
import { Gem } from 'lucide-react';
import { Button } from './ui/button'; // Assuming shadcn/ui Button

interface CreditsDisplayProps {
  credits: number;
  onPurchaseClick: () => void;
}

const CreditsDisplay: React.FC<CreditsDisplayProps> = ({ credits, onPurchaseClick }) => {
  return (
    <div className="hidden md:block absolute top-4 left-4 z-20">
      <Button
        onClick={onPurchaseClick}
        className="flex items-center justify-center space-x-2 bg-white/5 backdrop-blur-lg text-white hover:bg-white/20 rounded-lg border border-white/10 transition-all px-4 py-2"
        variant="default"
      >
        <Gem className="w-4 h-4 text-purple-400" />
        <span>{credits} Crédits</span>
      </Button>
    </div>
  );
};

export default CreditsDisplay;