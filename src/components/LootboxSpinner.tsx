"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  const [isCalculating, setIsCalculating] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

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

  const calculatePosition = useCallback(() => {
    if (containerRef.current && itemRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      
      const itemStyle = window.getComputedStyle(itemRef.current);
      const marginLeft = parseFloat(itemStyle.marginLeft);
      const marginRight = parseFloat(itemStyle.marginRight);
      const totalItemWidth = itemRef.current.offsetWidth + marginLeft + marginRight;

      const finalPosition = (containerWidth / 2) - (TARGET_INDEX * totalItemWidth + totalItemWidth / 2);
      const randomOffset = (Math.random() - 0.5) * (totalItemWidth * 0.8);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        setTranslateX(finalPosition + randomOffset);
        if (isCalculating) {
          setIsCalculating(false);
        }
      });
    }
  }, [isCalculating]);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) return;

    const observer = new ResizeObserver(() => {
        calculatePosition();
    });
    observer.observe(containerElement);

    const animationDuration = 5000;
    const timeoutId = setTimeout(() => {
      onSpinEnd();
    }, animationDuration + 200);

    return () => {
      clearTimeout(timeoutId);
      observer.unobserve(containerElement);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [resultLabel, onSpinEnd, calculatePosition]);

  return (
    <div ref={containerRef} className="h-full w-full bg-transparent rounded-lg relative overflow-hidden">
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1 h-[90%] bg-yellow-400/50 z-20 rounded-full" style={{ boxShadow: '0 0 10px yellow' }}/>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 
        border-l-[10px] border-l-transparent
        border-r-[10px] border-r-transparent
        border-t-[10px] border-t-yellow-400 z-20"
      />
       <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 
        border-l-[10px] border-l-transparent
        border-r-[10px] border-r-transparent
        border-b-[10px] border-b-yellow-400 z-20"
      />
      
      <div
        className="flex h-full items-center"
        style={{
          visibility: isCalculating ? 'hidden' : 'visible',
          transform: `translateX(${translateX}px)`,
          transition: isCalculating ? 'none' : 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {spinnerItems.map((item, index) => (
          <div
            key={index}
            ref={index === 0 ? itemRef : null}
            className={cn(
              "w-24 sm:w-32 h-24 flex-shrink-0 flex flex-col items-center justify-center text-white font-bold text-center p-2 rounded-md mx-1 border-2 border-white/10",
              item.color
            )}
          >
            <span className="text-xs sm:text-sm drop-shadow-md">{item.label}</span>
            <span className="text-sm sm:text-lg drop-shadow-md">x{item.multiplier}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LootboxSpinner;