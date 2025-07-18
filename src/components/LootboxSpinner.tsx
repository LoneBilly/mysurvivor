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
const TARGET_INDEX = 45;

const LootboxSpinner: React.FC<LootboxSpinnerProps> = ({ resultLabel, onSpinEnd }) => {
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

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
    if (containerRef.current && itemRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      
      const itemStyle = window.getComputedStyle(itemRef.current);
      const marginLeft = parseFloat(itemStyle.marginLeft);
      const marginRight = parseFloat(itemStyle.marginRight);
      const totalItemWidth = itemRef.current.offsetWidth + marginLeft + marginRight;

      const finalPosition = containerWidth / 2 - (TARGET_INDEX * totalItemWidth + totalItemWidth / 2);
      const randomOffset = (Math.random() - 0.5) * (totalItemWidth * 0.8);

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
    <div ref={containerRef} className="h-full w-full bg-transparent rounded-lg relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 
        border-l-[10px] border-l-transparent
        border-r-[10px] border-r-transparent
        border-t-[10px] border-t-yellow-400 z-20"
        style={{ filter: 'drop-shadow(0 0 5px rgba(250, 204, 21, 0.7))' }}
      />
      
      <div className="h-full w-full overflow-hidden">
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
              ref={index === 0 ? itemRef : null}
              className={cn(
                "w-24 sm:w-32 h-20 flex-shrink-0 flex flex-col items-center justify-center text-white font-bold text-center p-2 rounded-md mx-1 border-2 border-white/10",
                item.color
              )}
            >
              <span className="text-xs sm:text-sm drop-shadow-md">{item.label}</span>
              <span className="text-sm sm:text-lg drop-shadow-md">x{item.multiplier}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 
        border-l-[10px] border-l-transparent
        border-r-[10px] border-r-transparent
        border-b-[10px] border-b-yellow-400 z-20"
        style={{ filter: 'drop-shadow(0 0 5px rgba(250, 204, 21, 0.7))' }}
      />
    </div>
  );
};

export default LootboxSpinner;