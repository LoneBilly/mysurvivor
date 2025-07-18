import React from 'react';
import { Wheel as RouletteWheel } from 'react-custom-roulette';
import { Segment } from './CasinoModal'; // Assuming Segment is exported from CasinoModal

interface WheelProps {
  segments: Segment[];
  isSpinning: boolean;
  resultIndex: number | null;
  onSpinEnd?: () => void;
}

const Wheel = ({ segments, isSpinning, resultIndex, onSpinEnd }: WheelProps) => {
  const wheelData = segments.map(s => ({
    option: s.label,
    style: { backgroundColor: s.color, textColor: '#ffffff' }
  }));

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <RouletteWheel
        mustStartSpinning={isSpinning}
        prizeNumber={resultIndex ?? 0}
        data={wheelData}
        onStopSpinning={() => {
          if (onSpinEnd) {
            onSpinEnd();
          }
        }}
        backgroundColors={['#334155', '#1e293b']}
        textColors={['#ffffff']}
        outerBorderColor={"#475569"}
        outerBorderWidth={5}
        innerBorderColor={"#475569"}
        innerBorderWidth={10}
        radiusLineColor={"#475569"}
        radiusLineWidth={2}
        fontSize={12}
        textDistance={60}
        spinDuration={0.5}
      />
    </div>
  );
};

export default Wheel;