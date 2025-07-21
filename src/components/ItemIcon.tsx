import { cn } from '@/lib/utils';
import { useGame } from '@/contexts/GameContext';

interface ItemIconProps {
  iconName?: string | null;
  alt: string;
  className?: string;
}

const ItemIcon = ({ iconName, alt, className }: ItemIconProps) => {
  const { getIconUrl } = useGame();
  if (!iconName) {
    return <div className={cn("w-full h-full bg-gray-700 rounded-md", className)} />;
  }

  const iconUrl = getIconUrl(iconName);

  return (
    <img
      src={iconUrl}
      alt={alt}
      className={cn("w-full h-full object-cover", className)}
      loading="lazy"
    />
  );
};

export default ItemIcon;