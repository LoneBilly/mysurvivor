import React from 'react';
import { Users } from 'lucide-react';

interface FloatingInfoBarProps {
  playerCount: number | null;
}

const FloatingInfoBar: React.FC<FloatingInfoBarProps> = ({ playerCount }) => {
  if (playerCount === null) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-none border-2 border-black shadow-[4px_4px_0px_#000] z-50 flex items-center space-x-2 font-mono">
      <Users className="h-5 w-5" />
      <span>
        <span className="font-bold">{playerCount}</span> survivants ont rejoint la lutte.
      </span>
    </div>
  );
};

export default FloatingInfoBar;