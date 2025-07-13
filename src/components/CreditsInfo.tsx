import { Coins } from 'lucide-react';

interface CreditsInfoProps {
  credits: number;
  className?: string;
}

const CreditsInfo = ({ credits, className }: CreditsInfoProps) => {
  return (
    <div className={`flex items-center justify-center gap-2 text-yellow-400 font-mono ${className}`}>
      <Coins className="w-4 h-4" /> {credits} crédits
    </div>
  );
};

export default CreditsInfo;