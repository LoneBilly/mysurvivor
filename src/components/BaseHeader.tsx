import { TreeDeciduous, Mountain, Cog, Hammer } from 'lucide-react';
import { Item } from '@/types/game';
import ItemIcon from './ItemIcon';
import { useGame } from '@/contexts/GameContext';

interface ResourceItemProps {
  icon: React.ElementType;
  itemIcon?: Item;
  label: string;
  value: number;
}

const ResourceItem = ({ icon: Icon, itemIcon, label, value }: ResourceItemProps) => {
  const { getIconUrl } = useGame();
  const iconUrl = itemIcon ? getIconUrl(itemIcon.icon) : null;

  return (
    <div className="flex items-center space-x-2 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
      <div className="w-8 h-8 relative">
        {itemIcon ? (
          <ItemIcon iconName={iconUrl || itemIcon.icon} alt={label} />
        ) : (
          <Icon className="w-8 h-8 text-white flex-shrink-0" />
        )}
      </div>
      <span className="hidden sm:inline font-mono text-sm text-gray-300">{itemIcon?.name || label}:</span>
      <span className="font-mono font-bold text-white">{value}</span>
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
    wood: Item | undefined;
    metal: Item | undefined;
    real_metal: Item | undefined;
    components: Item | undefined;
  };
}

const BaseHeader = ({ resources, resourceItems }: BaseHeaderProps) => {
  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 w-auto max-w-[95%] z-10">
      <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-lg p-2 rounded-xl shadow-lg border border-white/20">
        <ResourceItem icon={TreeDeciduous} itemIcon={resourceItems.wood} label="Bois" value={resources.wood} />
        <ResourceItem icon={Mountain} itemIcon={resourceItems.metal} label="Pierre" value={resources.metal} />
        <ResourceItem icon={Hammer} itemIcon={resourceItems.real_metal} label="Métal" value={resources.metal_ingots} />
        <ResourceItem icon={Cog} itemIcon={resourceItems.components} label="Composants" value={resources.components} />
      </div>
    </header>
  );
};

export default BaseHeader;