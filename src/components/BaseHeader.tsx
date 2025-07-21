import { Item } from '@/types/game';
import ItemIcon from './ItemIcon';
import { useGame } from '@/contexts/GameContext';
import { Skeleton } from "@/components/ui/skeleton";

interface ResourceDisplayProps {
  label: string;
  value: number;
  itemIcon?: Item | null;
  iconUrl?: string | null;
}

const ResourceDisplay = ({ label, value, itemIcon, iconUrl }: ResourceDisplayProps) => {
  return (
    <div className="flex items-center space-x-2 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
      <div className="w-8 h-8 relative">
        {itemIcon ? (
          <ItemIcon iconName={iconUrl || itemIcon.icon} alt={label} />
        ) : (
          <Skeleton className="w-full h-full rounded-md" />
        )}
      </div>
      <span className="font-mono text-lg font-bold">{value}</span>
    </div>
  );
};

interface BaseHeaderProps {
  resources: {
    wood: number;
    metal: number;
    components: number;
    metal_ingots: number;
  };
  resourceItems: {
    wood?: Item | null;
    metal?: Item | null;
    real_metal?: Item | null;
    components?: Item | null;
  };
}

const BaseHeader = ({ resources, resourceItems }: BaseHeaderProps) => {
  const { getIconUrl } = useGame();

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex flex-wrap justify-center gap-2">
      <ResourceDisplay label="Bois" value={resources.wood} itemIcon={resourceItems.wood} iconUrl={resourceItems.wood ? getIconUrl(resourceItems.wood.icon) : null} />
      <ResourceDisplay label="Pierre" value={resources.metal} itemIcon={resourceItems.metal} iconUrl={resourceItems.metal ? getIconUrl(resourceItems.metal.icon) : null} />
      <ResourceDisplay label="Lingots de métal" value={resources.metal_ingots} itemIcon={resourceItems.real_metal} iconUrl={resourceItems.real_metal ? getIconUrl(resourceItems.real_metal.icon) : null} />
      <ResourceDisplay label="Composants" value={resources.components} itemIcon={resourceItems.components} iconUrl={resourceItems.components ? getIconUrl(resourceItems.components.icon) : null} />
    </div>
  );
};

export default BaseHeader;