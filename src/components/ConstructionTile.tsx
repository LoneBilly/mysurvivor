import { BaseConstruction } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import { motion } from 'framer-motion';
import { Hammer, Clock, Info, Flame } from 'lucide-react';
import ItemIcon from './ItemIcon';
import { Progress } from "@/components/ui/progress";

interface ConstructionTileProps {
  construction: BaseConstruction;
  onClick: () => void;
  isJob: boolean;
  jobEndsAt?: string;
  jobType?: string;
  jobTargetLevel?: number;
}

const MAX_BURN_TIME_SECONDS = 72 * 60 * 60;

const ConstructionTile = ({ construction, onClick, isJob, jobEndsAt, jobType, jobTargetLevel }: ConstructionTileProps) => {
  const { getBuildingDefinition, getIconUrl, buildingLevels } = useGame();
  
  const typeToDisplay = jobType || construction.type;
  const levelToDisplay = jobTargetLevel || construction.level;

  const buildingDef = getBuildingDefinition(typeToDisplay);

  const burnPercentage = construction.type === 'campfire' 
    ? ((construction.burn_time_remaining_seconds || 0) / MAX_BURN_TIME_SECONDS) * 100
    : 0;

  const levelDef = buildingLevels.find(bl => bl.building_type === typeToDisplay && bl.level === levelToDisplay);
  const iconName = levelDef?.stats?.icon || buildingDef?.icon;

  return (
    <motion.div
      layoutId={`construction-${construction.x}-${construction.y}`}
      className="relative aspect-square bg-slate-800/50 rounded-md flex flex-col items-center justify-center p-2 text-center cursor-pointer border-2 border-slate-700 hover:border-slate-500 transition-colors"
      onClick={onClick}
    >
      {isJob && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-md">
          <div className="text-center">
            <Hammer className="w-8 h-8 text-yellow-400 animate-bounce mx-auto" />
            <p className="text-xs font-bold text-white mt-1">Construction</p>
          </div>
        </div>
      )}
      <div className="w-10 h-10 mb-1 flex items-center justify-center">
        {iconName ? (
          <ItemIcon iconName={getIconUrl(iconName)} alt={buildingDef?.name || typeToDisplay} />
        ) : (
          <div className="w-8 h-8 bg-slate-700 rounded-md" />
        )}
      </div>
      <p className="text-xs font-bold leading-tight line-clamp-2">{buildingDef?.name || typeToDisplay}</p>
      <p className="text-[10px] text-slate-400">Niv. {levelToDisplay}</p>

      {construction.type === 'campfire' && (construction.burn_time_remaining_seconds || 0) > 0 && (
        <div className="absolute bottom-1 left-1 right-1 px-1 flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-400 flex-shrink-0" />
          <Progress value={burnPercentage} className="h-1.5 w-full bg-slate-600 [&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-orange-500" />
        </div>
      )}
    </motion.div>
  );
};

export default ConstructionTile;