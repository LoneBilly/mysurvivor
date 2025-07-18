"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const SPINNER_ITEMS_COUNT = 50;
const ITEM_WIDTH_PX = 128 + 8; // w-32 (128px) + mx-1 (4px on each side = 8px)
const TARGET_INDEX = 45;

const LootboxSpinner: React.FC<LootboxSpinnerProps> = ({ resultLabel, onSpinEnd }) => {
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const spinnerItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < SPINNER_ITEMS_COUNT; i++) {
      if (i === TARGET_INDEX) {
        items.push(getOutcomeByLabel(resultLabel));
      } else {
        items.push(outcomes[Math.floor(Math.random() * outcomes.length)]);
      }
    }
    return items;
  }, [resultLabel]);

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const finalPosition = containerWidth / 2 - (TARGET_INDEX * ITEM_WIDTH_PX + ITEM_WIDTH_PX / 2);
      const randomOffset = (Math.random() - 0.5) * (ITEM_WIDTH_PX * 0.8);

      setTranslateX(0);

      setTimeout(() => {
        setTranslateX(finalPosition + randomOffset);
      }, 100);

      const animationDuration = 5000;
      setTimeout(() => {
        onSpinEnd();
      }, animationDuration + 200);
    }
  }, [resultLabel, onSpinEnd]);

  return (
    <div ref={containerRef} className="h-24 w-full bg-transparent rounded-lg overflow-hidden relative">
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-1 bg-white/80 z-10 rounded-full"
        style={{ boxShadow: '0 0 15px 2px white' }}
      />
      <div
        className="flex h-full items-center"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {spinnerItems.map((item, index) => (
          <div
            key={index}
            className={cn(
              "w-32 h-20 flex-shrink-0 flex flex-col items-center justify-center text-white font-bold text-center p-2 rounded-md mx-1 border-2 border-white/10",
              item.color
            )}
          >
            <span className="text-sm drop-shadow-md">{item.label}</span>
            <span className="text-lg drop-shadow-md">x{item.multiplier}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LootboxSpinner;