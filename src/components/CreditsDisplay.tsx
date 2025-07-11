import { Coins } from 'lucide-react';

interface CreditsDisplayProps {
  credits: number;
  onClick: () => void;
}

const CreditsDisplay = ({ credits, onClick }: CreditsDisplayProps) => {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-lg p-2 rounded-xl shadow-lg border border-white/20 hover:bg-white/20 transition-colors"
    >
      <Coins className="w-5 h-5 text-yellow-400" />
      <span className="font-mono text-sm font-bold text-white">{credits}</span>
    </button>
  );
};

export default CreditsDisplay;