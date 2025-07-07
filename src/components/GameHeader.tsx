import React, { useState, useEffect } from 'react';
import { Heart, Zap, Droplet, Utensils } from 'lucide-react';

interface GameHeaderProps {
  vie: number;
  energie: number;
  soif: number;
  faim: number;
  joursSurvecus: number;
  spawnDate: string;
}

const GameHeader: React.FC<GameHeaderProps> = ({ vie, energie, soif, faim, joursSurvecus, spawnDate }) => {
  const [hoursSinceSpawn, setHoursSinceSpawn] = useState(0);

  useEffect(() => {
    if (spawnDate) {
      const calculateTime = () => {
        const spawnDateTime = new Date(spawnDate);
        const now = new Date();
        const diffInMs = now.getTime() - spawnDateTime.getTime();
        const hours = Math.floor(diffInMs / (1000 * 60 * 60));
        setHoursSinceSpawn(hours);
      };

      calculateTime();
      const intervalId = setInterval(calculateTime, 60000); // Mise à jour toutes les minutes

      return () => clearInterval(intervalId);
    }
  }, [spawnDate]);

  return (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <Heart className="text-red-500 mr-2" />
          <span>{vie}</span>
        </div>
        <div className="flex items-center">
          <Zap className="text-yellow-500 mr-2" />
          <span>{energie}</span>
        </div>
        <div className="flex items-center">
          <Droplet className="text-blue-500 mr-2" />
          <span>{soif}</span>
        </div>
        <div className="flex items-center">
          <Utensils className="text-orange-500 mr-2" />
          <span>{faim}</span>
        </div>
      </div>
      <div className="flex-none text-center px-4">
        <p className="text-lg">
          Jours survécus: <span className="text-green-500 font-bold">{joursSurvecus}</span>
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Temps de jeu : {hoursSinceSpawn}h
        </p>
      </div>
      <div>
        {/* Espace réservé pour d'autres éléments */}
      </div>
    </div>
  );
};

export default GameHeader;