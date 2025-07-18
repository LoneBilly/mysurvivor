"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

const outcomes = [
    { label: "Perte Totale", multiplier: 0, color: "bg-gray-700" },
    { label: "Petite Perte", multiplier: 0.5, color: "bg-yellow-700" },
    { label: "Remboursé", multiplier: 1, color: "bg-blue-700" },
    { label: "Double Gain", multiplier: 2, color: "bg-green-600" },
    { label: "Jackpot!", multiplier: 5, color: "bg-purple-600" },
];

const getOutcomeByLabel = (label: string) => outcomes.find(o => o.label === label) || outcomes[0];

interface LootboxSpinnerProps {
  resultLabel: string;
  onSpinEnd: () => void;
}

const LootboxSpinner: React.FC<LootboxSpinnerProps> = ({ resultLabel, onSpinEnd }) => {
  const [currentItem, setCurrentItem] = useState(outcomes[0]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let currentInterval = 75;
    let slowDownStarted = false;

    const spin = () => {
      setCurrentItem(outcomes[Math.floor(Math.random() * outcomes.length)]);
      intervalRef.current = setTimeout(spin, currentInterval);
    };

    spin();

    // Slow down phase
    timeoutRef.current = setTimeout(() => {
      slowDownStarted = true;
      currentInterval = 300;
    }, 3000);

    // Final result
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      setCurrentItem(getOutcomeByLabel(resultLabel));
      setTimeout(onSpinEnd, 500); // Wait a bit on the final result before ending
    }, 5000);

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resultLabel, onSpinEnd]);

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center text-white font-bold text-center p-2 rounded-md border-2 border-white/10 transition-colors duration-200",
        currentItem.color
      )}
    >
      <span className="text-lg sm:text-xl drop-shadow-md">{currentItem.label}</span>
      <span className="text-2xl sm:text-3xl drop-shadow-md">x{currentItem.multiplier}</span>
    </div>
  );
};

export default LootboxSpinner;