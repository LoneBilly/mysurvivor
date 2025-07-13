import { TreeDeciduous, Hammer, Cog } from 'lucide-react';
import { Item } from '@/types/game';
import ItemIcon from './ItemIcon';

interface ResourceItemProps {
  icon: React.ElementType;
  itemIcon?: Item & { signedIconUrl?: string };
  label: string;
  value: number;
}

const ResourceItem = ({ icon: Icon, itemIcon, label, value }: ResourceItemProps) => (
  <div className="flex items-center space-x-2 bg-white/5 px-2 sm:px-3 py-2 rounded-lg border border-white/10">
    <div className="w-5 h-5 relative">
      {itemIcon ? (
        <ItemIcon iconName={itemIcon.signedIconUrl || itemIcon.icon} alt={itemIcon.name} />
      ) : (
        <Icon className="w-5 h-5 text-white flex-shrink-0" />
      )}
    </div>
    <span className="hidden sm:inline font-mono text-sm text-gray-300">{label}:</span>
    <span className="font-mono text-sm font-bold text-white">{value}</span>
  </div>
);

interface BaseHeaderProps {
  resources: {
    wood: number;
    metal: number;
    components: number;
  };
  resourceItems: {
    wood: (Item & { signedIconUrl?: string }) | undefined;
    metal: (Item & { signedIconUrl?: string }) | undefined;
    components: (Item & { signedIconUrl?: string }) | undefined;
  };
}

const BaseHeader = ({ resources, resourceItems }: BaseHeaderProps) => {
  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 w-auto max-w-[95%] z-10">
      <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-lg p-2 rounded-xl shadow-lg border border-white/20">
        <ResourceItem icon={TreeDeciduous} itemIcon={resourceItems.wood} label="Bois" value={resources.wood} />
        <ResourceItem icon={Hammer} itemIcon={resourceItems.metal} label="Métal" value={resources.metal} />
        <ResourceItem icon={Cog} itemIcon={resourceItems.components} label="Composants" value={resources.components} />
      </div>
    </header>
  );
};

export default BaseHeader;