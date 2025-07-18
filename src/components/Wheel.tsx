import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface WheelProps {
  segments: { multiplier: number; color: string }[];
  resultMultiplier: number | null;
  isSpinning: boolean;
}

const Wheel = ({ segments, resultMultiplier, isSpinning }: WheelProps) => {
  const [rotation, setRotation] = useState(0);
  const segmentCount = segments.length;
  const segmentAngle = 360 / segmentCount;

  useEffect(() => {
    if (isSpinning && resultMultiplier !== null) {
      // Find all possible indices for the result multiplier
      const possibleIndices = segments.reduce((acc, segment, index) => {
        if (segment.multiplier === resultMultiplier) {
          acc.push(index);
        }
        return acc;
      }, [] as number[]);
      
      // Pick a random one if multiple exist
      const resultIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];

      const targetAngle = 360 - (resultIndex * segmentAngle);
      const randomOffset = (Math.random() - 0.5) * (segmentAngle * 0.8);
      const fullSpins = 6 * 360;
      const finalRotation = fullSpins + targetAngle + randomOffset;

      setRotation(finalRotation);
    }
  }, [isSpinning, resultMultiplier, segments, segmentAngle]);

  return (
    <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
      <div className="absolute w-4 h-4 top-[-8px] left-1/2 -translate-x-1/2 z-10">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
      </div>
      <div
        className="relative w-full h-full rounded-full border-4 border-slate-600 shadow-lg transition-transform duration-[6000ms] ease-out"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {segments.map((segment, index) => (
          <div
            key={index}
            className="absolute w-1/2 h-1/2 origin-bottom-right"
            style={{
              transform: `rotate(${index * segmentAngle}deg)`,
              clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 0)`,
            }}
          >
            <div
              className={cn("absolute w-full h-full origin-bottom-right flex items-center justify-start pl-4", segment.color)}
              style={{ transform: `rotate(${segmentAngle / 2}deg) skewY(${segmentAngle - 90}deg)` }}
            >
              <span className="text-white font-bold text-lg" style={{ transform: `skewY(${90 - segmentAngle}deg) rotate(-${segmentAngle / 2}deg)` }}>
                x{segment.multiplier}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wheel;