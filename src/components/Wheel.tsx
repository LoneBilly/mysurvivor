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
      const targetSegmentCenter = 360 - (resultIndex * segmentAngle) - (segmentAngle / 2);
      const randomOffset = (Math.random() - 0.5) * (segmentAngle * 0.8);
      const finalAngle = targetSegmentCenter + randomOffset;

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
    <div className="relative w-56 h-56 flex items-center justify-center">
      {/* Pointer */}
      <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-red-600"></div>
        <div className="absolute top-[2px] left-[-5px] w-2.5 h-2.5 bg-white rounded-full"></div>
      </div>

      {/* Wheel container with outer shadow/border */}
      <div className="relative w-full h-full rounded-full shadow-2xl bg-gray-800 p-2">
        <div
          className="relative w-full h-full rounded-full overflow-hidden"
          onTransitionEnd={handleTransitionEnd}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning 
              ? 'transform 1s cubic-bezier(0.5, 1, 0.5, 1)' 
              : 'transform 6s cubic-bezier(0.1, 0.5, 0.2, 1)',
          }}
        >
          {/* Segments background */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `conic-gradient(from 0deg, ${conicGradient})` }}
          />

          {/* Dividers */}
          {segments.map((_, index) => (
            <div
              key={`divider-${index}`}
              className="absolute w-[2px] h-1/2 bg-yellow-400/70 top-0 left-1/2 -translate-x-1/2 origin-bottom shadow-md"
              style={{
                transform: `rotate(${index * segmentAngle}deg)`,
              }}
            />
          ))}

          {/* Labels */}
          {segments.map((segment, index) => (
            <div
              key={`label-${index}`}
              className="absolute w-1/2 h-1/2 origin-bottom-right flex items-center justify-start"
              style={{
                transform: `rotate(${index * segmentAngle}deg)`,
              }}
            >
              <span 
                className={cn(
                  "text-white text-xs font-bold transform -rotate-90 ml-4",
                  numSegments > 10 ? 'opacity-0' : ''
                )}
                style={{ transform: `translateX(50%) translateY(-100%) rotate(${segmentAngle/2}deg) scale(0.9)` }}
              >
                {segment.label}
              </span>
            </div>
          ))}
        </div>

        {/* Center Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border-4 border-yellow-400 shadow-inner z-10"></div>
      </div>
    </div>
  );
};

export default Wheel;