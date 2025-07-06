import { TreeDeciduous, Hammer, Cog } from 'lucide-react';

interface ResourceItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
}

const ResourceItem = ({ icon: Icon, label, value }: ResourceItemProps) => (
  <div className="flex items-center space-x-2 bg-gray-700/50 px-2 sm:px-3 py-2 rounded-lg">
    <Icon className="w-5 h-5 text-gray-300 flex-shrink-0" />
    <span className="hidden sm:inline font-mono text-sm text-white">{label}:</span>
    <span className="font-mono text-sm font-bold text-green-400">{value}</span>
  </div>
);

interface BaseHeaderProps {
  resources: {
    wood: number;
    metal: number;
    components: number;
  };
}

const BaseHeader = ({ resources }: BaseHeaderProps) => {
  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 w-auto max-w-[95%] z-10">
      <div className="flex items-center justify-center space-x-2 bg-gray-800/80 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-gray-700">
        <ResourceItem icon={TreeDeciduous} label="Bois" value={resources.wood} />
        <ResourceItem icon={Hammer} label="Métal" value={resources.metal} />
        <ResourceItem icon={Cog} label="Composants" value={resources.components} />
      </div>
    </header>
  );
};

export default BaseHeader;