import React from 'react';

interface GameHeaderProps {
  daysSurvived: number;
  onLeaderboardClick: () => void;
  onOptionsClick: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  daysSurvived,
  onLeaderboardClick,
  onOptionsClick
}) => {
  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
      <button
        onClick={onLeaderboardClick}
        className="text-white hover:text-gray-300 transition-colors font-medium"
      >
        Classement
      </button>
      
      <div className="text-center">
        <span className="text-lg">
          Jours survécus : <span className="text-green-400 font-bold">{daysSurvived}</span>
        </span>
      </div>
      
      <button
        onClick={onOptionsClick}
        className="text-white hover:text-gray-300 transition-colors font-medium"
      >
        Options
      </button>
    </header>
  );
};

export default GameHeader;