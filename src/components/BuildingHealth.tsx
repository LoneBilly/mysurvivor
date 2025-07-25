import { Progress } from '@/components/ui/progress';
import { Heart } from 'lucide-react';

interface BuildingHealthProps {
  currentHp: number | undefined;
  maxHp: number | undefined;
}

const BuildingHealth = ({ currentHp, maxHp }: BuildingHealthProps) => {
  if (maxHp == null || currentHp == null) return null;

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-slate-400 mb-1 text-sm">Points de Vie</h4>
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-red-400 flex-shrink-0" />
        <Progress value={(currentHp / maxHp) * 100} className="w-full [&>*]:bg-red-400" />
        <span className="font-bold text-sm whitespace-nowrap">{currentHp} / {maxHp}</span>
      </div>
    </div>
  );
};

export default BuildingHealth;