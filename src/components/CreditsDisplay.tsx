import { Coins } from 'lucide-react';

interface CreditsDisplayProps {
  credits: number;
}

const CreditsDisplay = ({ credits }: CreditsDisplayProps) => {
  return (
    <div className="absolute top-20 sm:top-4 right-4 z-10">
      <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-lg p-2 rounded-xl shadow-lg border border-white/20">
        <Coins className="w-5 h-5 text-yellow-400" />
        <span className="font-mono text-sm font-bold text-white">{credits}</span>
      </div>
    </div>
  );
};

export default CreditsDisplay;