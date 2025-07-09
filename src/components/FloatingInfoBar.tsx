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
    <div className="fixed bottom-0 left-0 right-0 w-full z-50 pointer-events-none">
      <div className="container mx-auto px-4 pb-4">
        <div className="bg-black/80 backdrop-blur-sm text-white rounded-none border-2 border-gray-700 shadow-lg flex items-center justify-center gap-4 sm:gap-8 p-3 w-fit mx-auto">
          {playerCount !== null && (
            <div className="flex items-center gap-2 text-sm sm:text-base">
              <Users className="w-5 h-5 text-green-400" />
              <span className="font-bold">{playerCount}</span>
              <span>survivants</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloatingInfoBar;