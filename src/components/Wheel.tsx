import React from 'react';
import { Wheel as RouletteWheel } from 'react-custom-roulette';

export interface Segment {
  label: string;
  color: string;
}

interface WheelProps {
  segments: Segment[];
  mustStartSpinning: boolean;
  prizeNumber: number | null;
  onStopSpinning: () => void;
}

const Wheel = ({ segments, mustStartSpinning, prizeNumber, onStopSpinning }: WheelProps) => {
  const wheelData = segments.map(s => ({
    option: s.label,
    style: { backgroundColor: s.color, textColor: '#ffffff' },
  }));

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <RouletteWheel
        mustStartSpinning={mustStartSpinning}
        prizeNumber={prizeNumber ?? 0}
        data={wheelData}
        onStopSpinning={onStopSpinning}
        
        // Styling
        outerBorderColor={"#a16207"} // amber-700
        outerBorderWidth={8}
        innerBorderColor={"#f59e0b"} // amber-500
        innerBorderWidth={4}
        radiusLineColor={"#f59e0b"} // amber-500
        radiusLineWidth={2}
        
        fontSize={12}
        textDistance={60}
        
        spinDuration={0.5} // Controls the speed
        startingOptionIndex={Math.floor(Math.random() * segments.length)}
        pointerProps={{
          style: {
            borderTop: '15px solid #dc2626', // red-600
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            top: '50%',
            transform: 'translateY(-50%) rotate(90deg) translateX(105px)',
          }
        }}
      />
    </div>
  );
};

export default Wheel;