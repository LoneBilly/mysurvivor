import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface Segment {
  label: string;
  color: string;
}

interface WheelProps {
  segments: Segment[];
  isSpinning: boolean;
  resultIndex: number | null;
  onSpinEnd?: () => void;
}

const Wheel = ({ segments, isSpinning, resultIndex, onSpinEnd }: WheelProps) => {
  const [rotation, setRotation] = useState(0);
  const numSegments = segments.length;
  const segmentAngle = 360 / numSegments;

  useEffect(() => {
    if (isSpinning) {
      const randomSpins = 5 + Math.floor(Math.random() * 5);
      setRotation(prev => prev + 360 * randomSpins);
    } else if (resultIndex !== null) {
      const targetAngle = 360 - (resultIndex * segmentAngle);
      const randomOffset = (Math.random() * 0.8 + 0.1) * segmentAngle;
      const finalAngle = targetAngle - randomOffset;

      setRotation(prev => {
        const currentRevolutions = Math.floor(prev / 360);
        let newRotation = (currentRevolutions * 360) + finalAngle;
        if (newRotation < prev) {
          newRotation += 360;
        }
        return newRotation;
      });
    }
  }, [isSpinning, resultIndex, segmentAngle]);

  const handleTransitionEnd = () => {
    if (!isSpinning && onSpinEnd) {
      onSpinEnd();
    }
  };

  const conicGradient = segments.map((s, i) => `${s.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`).join(', ');

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <div
        className="relative w-full h-full rounded-full border-4 border-yellow-400/50 shadow-lg overflow-hidden"
        onTransitionEnd={handleTransitionEnd}
        style={{
          background: `conic-gradient(from 0deg, ${conicGradient})`,
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning 
            ? 'transform 1s cubic-bezier(0.5, 1, 0.5, 1)' 
            : 'transform 5s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {/* Dividers */}
        {segments.map((_, index) => (
          <div
            key={`divider-${index}`}
            className="absolute w-[2px] h-1/2 bg-black/25 top-0 left-1/2 -translate-x-1/2 origin-bottom"
            style={{
              transform: `rotate(${index * segmentAngle}deg)`,
            }}
          />
        ))}
        {/* Labels */}
        {segments.map((segment, index) => (
          <div
            key={`label-${index}`}
            className="absolute w-1/2 h-1/2 origin-bottom-right flex items-center justify-center"
            style={{
              transform: `rotate(${index * segmentAngle}deg)`,
            }}
          >
            <span 
              className={cn(
                "text-white text-[10px] font-bold transform -rotate-90",
                numSegments > 10 ? 'opacity-0' : '' // Hide labels if too many segments
              )}
              style={{ transform: `translateX(-50%) translateY(-150%) rotate(${segmentAngle/2}deg)` }}
            >
              {segment.label}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-yellow-400 z-20"></div>
      <div className="absolute w-8 h-8 bg-gray-800 rounded-full border-4 border-yellow-500 z-10"></div>
    </div>
  );
};

export default Wheel;