import { Button } from "@/components/ui/button";
import { Trophy, Settings } from "lucide-react";

interface GameHeaderProps {
  joursSurvecus: number;
  onLeaderboard: () => void;
  onOptions: () => void;
}

const GameHeader = ({ joursSurvecus, onLeaderboard, onOptions }: GameHeaderProps) => {
  return (
    <header className="h-[10vh] bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-2">
        <span className="text-lg md:text-xl font-bold">
          Jour {joursSurvecus}
        </span>
      </div>
      
      <div className="flex space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onLeaderboard}
          className="flex items-center space-x-1"
        >
          <Trophy className="w-4 h-4" />
          <span className="hidden sm:inline">Classement</span>
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onOptions}
          className="flex items-center space-x-1"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Options</span>
        </Button>
      </div>
    </header>
  );
};

export default GameHeader;