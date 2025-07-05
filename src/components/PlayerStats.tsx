import React from 'react';
import { Progress } from '@/components/ui/progress';

interface PlayerStatsProps {
  vie: number;
  faim: number;
  soif: number;
  energie: number;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({
  vie,
  faim,
  soif,
  energie
}) => {
  const StatBar = ({ 
    title, 
    value, 
    max = 100, 
    color 
  }: { 
    title: string; 
    value: number; 
    max?: number; 
    color: string;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-white font-medium">{title}</span>
        <span className="text-gray-300 text-sm">{value}/{max}</span>
      </div>
      <Progress 
        value={(value / max) * 100} 
        className="h-3"
        style={{
          '--progress-background': color,
        } as React.CSSProperties}
      />
    </div>
  );

  return (
    <div className="bg-slate-700 rounded-lg p-4 space-y-4">
      <h3 className="text-white text-lg font-semibold mb-4">Statistiques</h3>
      
      <StatBar 
        title="Vie" 
        value={vie} 
        color="#ef4444" 
      />
      
      <StatBar 
        title="Soif" 
        value={soif} 
        color="#3b82f6" 
      />
      
      <StatBar 
        title="Faim" 
        value={faim} 
        color="#f97316" 
      />
      
      <StatBar 
        title="Énergie" 
        value={energie} 
        color="#eab308" 
      />
    </div>
  );
};

export default PlayerStats;