import * as LucideIcons from 'lucide-react';

interface ExplorationHeaderProps {
  zoneName: string;
  zoneIcon: string | null;
}

const ExplorationHeader = ({ zoneName, zoneIcon }: ExplorationHeaderProps) => {
  const IconComponent = zoneIcon ? (LucideIcons as any)[zoneIcon] : LucideIcons.MapPin;

  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 w-auto max-w-[95%] z-10">
      <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-lg py-2 px-3 rounded-xl shadow-lg border border-white/20">
        <IconComponent className="w-5 h-5 text-white flex-shrink-0" />
        <h2 className="font-semibold text-base text-white font-mono whitespace-nowrap">{zoneName}</h2>
      </div>
    </header>
  );
};

export default ExplorationHeader;