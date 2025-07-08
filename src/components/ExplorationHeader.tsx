import * as LucideIcons from 'lucide-react';

interface ExplorationHeaderProps {
  zoneName: string;
  zoneIcon: string | null;
}

const ExplorationHeader = ({ zoneName, zoneIcon }: ExplorationHeaderProps) => {
  const IconComponent = zoneIcon ? (LucideIcons as any)[zoneIcon] : LucideIcons.MapPin;

  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 w-auto max-w-[95%] z-10">
      <div className="flex items-center justify-center space-x-3 bg-gray-800/80 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-700">
        <IconComponent className="w-6 h-6 text-gray-300 flex-shrink-0" />
        <h2 className="font-bold text-lg text-white">{zoneName}</h2>
      </div>
    </header>
  );
};

export default ExplorationHeader;