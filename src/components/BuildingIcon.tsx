import { Home, Hammer, Archive, Tent } from 'lucide-react';

export const BuildingIcon = ({ type, className = "w-8 h-8" }: { type: string, className?: string }) => {
  switch (type) {
    case 'foundation':
      return <div className={`w-full h-full bg-gray-600/50 rounded-sm ${className}`}></div>;
    case 'workbench':
      return <Hammer className={className} />;
    case 'chest':
      return <Archive className={className} />;
    case 'campfire':
        return <Tent className={className} />;
    default:
      return <Home className={className} />;
  }
};