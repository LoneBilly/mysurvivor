"use client";

import React from 'react';
import { Gem } from 'lucide-react';
import { Button } from './ui/button'; // Assuming shadcn/ui Button
import { cn } from '@/lib/utils'; // Import cn for class merging

interface CreditsDisplayProps {
  credits: number;
  onPurchaseClick: () => void;
  className?: string; // Add className prop for external styling
}

const CreditsDisplay: React.FC<CreditsDisplayProps> = ({ credits, onPurchaseClick, className }) => {
  return (
    <Button
      onClick={onPurchaseClick}
      className={cn(
        "flex items-center justify-center space-x-2 bg-white/5 backdrop-blur-lg text-white hover:bg-white/20 rounded-lg border border-white/10 transition-all px-4 py-2",
        className // Apply external classes
      )}
      variant="default"
    >
      <Gem className="w-4 h-4 text-purple-400" />
      <span>{credits} Crédits</span>
    </Button>
  );
};

export default CreditsDisplay;