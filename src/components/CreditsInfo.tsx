import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditsInfoProps {
  credits: number;
  className?: string;
  onClick?: () => void;
}

const CreditsInfo = ({ credits, className, onClick }: CreditsInfoProps) => {
  const baseClasses = "flex items-center justify-center gap-2 text-yellow-400 font-mono";
  
  const content = (
    <>
      <Coins className="w-4 h-4" /> {credits} crédits
    </>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick} 
        className={cn(baseClasses, "hover:text-yellow-300 transition-colors animate-credit-shimmer", className)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn(baseClasses, className)}>
      {content}
    </div>
  );
};

export default CreditsInfo;