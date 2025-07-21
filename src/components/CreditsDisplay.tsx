import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";

interface CreditsDisplayProps {
  credits: number;
  onPurchaseClick: () => void;
}

const CreditsDisplay = ({ credits, onPurchaseClick }: CreditsDisplayProps) => {
  return (
    <Button
      onClick={onPurchaseClick}
      className="hidden md:flex items-center justify-center space-x-2 bg-white/5 backdrop-blur-lg text-white hover:bg-white/20 rounded-lg border border-white/10 transition-all px-4 py-2"
      variant="default"
    >
      <Coins className="w-5 h-5 text-yellow-400" />
      <span className="font-bold">{credits}</span>
    </Button>
  );
};

export default CreditsDisplay;