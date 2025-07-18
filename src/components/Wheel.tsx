import React, { useEffect, useState } from 'react';

export interface Segment {
  label: string;
  color: string;
}

interface WheelProps {
  segments: Segment[];
  isSpinning: boolean;
  resultIndex: number | null;
}

const Wheel = ({ segments, isSpinning, resultIndex }: WheelProps) => {
  const [rotation, setRotation] = useState(0);
  const numSegments = segments.length;
  const segmentAngle = 360 / numSegments;

  useEffect(() => {
    if (isSpinning) {
      const randomSpins = 5 + Math.floor(Math.random() * 3);
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

  const conicGradient = segments.map((s, i) => `${s.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`).join(', ');

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <div
        className="relative w-full h-full rounded-full border-4 border-yellow-400/50 shadow-lg overflow-hidden transition-transform duration-[3000ms] ease-out"
        style={{
          background: `conic-gradient(from 0deg, ${conicGradient})`,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {segments.map((segment, index) => (
          <div
            key={index}
            className="absolute w-1/2 h-1/2 origin-bottom-right flex items-center"
            style={{
              transform: `rotate(${index * segmentAngle + segmentAngle / 2}deg)`,
            }}
          >
            <span 
              className="text-white text-[10px] font-bold transform -rotate-90"
              style={{ marginLeft: '-50px' }}
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