import { TreeDeciduous, Hammer, Cog } from 'lucide-react';

interface ResourceItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
}

const ResourceItem = ({ icon: Icon, label, value }: ResourceItemProps) => (
  <div className="flex items-center space-x-2 bg-white px-2 sm:px-3 py-2 rounded-none border-2 border-black">
    <Icon className="w-5 h-5 text-black flex-shrink-0" />
    <span className="hidden sm:inline font-mono text-sm text-black">{label}:</span>
    <span className="font-mono text-sm font-bold text-black">{value}</span>
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
      <div className="flex items-center justify-center space-x-2 bg-white/80 backdrop-blur-sm p-2 rounded-none shadow-[4px_4px_0px_#000] border-2 border-black">
        <ResourceItem icon={TreeDeciduous} label="Bois" value={resources.wood} />
        <ResourceItem icon={Hammer} label="Métal" value={resources.metal} />
        <ResourceItem icon={Cog} label="Composants" value={resources.components} />
      </div>
    </header>
  );
};

export default BaseHeader;