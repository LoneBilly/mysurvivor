import { Button } from "@/components/ui/button";
import { Trophy, Settings } from "lucide-react";

interface GameHeaderProps {
  joursSurvecus: number;
  onLeaderboard: () => void;
  onOptions: () => void;
}

const GameHeader = ({ joursSurvecus, onLeaderboard, onOptions }: GameHeaderProps) => {
  return (
    <header className="h-[10vh] bg-gray-800 border-b border-gray-700 text-white px-4 flex items-center justify-between shadow-lg">
      {/* Gauche : Bouton Classement */}
      <Button
        variant="ghost" // Utilisation de la variante ghost pour enlever les bordures
        size="sm"
        onClick={onLeaderboard}
        className="flex items-center space-x-1 text-gray-200 hover:bg-gray-700 hover:text-white"
      >
        <Trophy className="w-4 h-4" />
        <span className="hidden sm:inline">Classement</span>
      </Button>
      
      {/* Centre : Jours survécus */}
      <div className="flex items-center space-x-2">
        <span className="text-lg md:text-xl font-bold text-white">
          Jours survécus:{" "}
          <span className="text-green-500">{joursSurvecus}</span> {/* Le nombre de jours en vert */}
        </span>
      </div>
      
      {/* Droite : Bouton Options */}
      <Button
        variant="ghost" // Utilisation de la variante ghost pour enlever les bordures
        size="sm"
        onClick={onOptions}
        className="flex items-center space-x-1 text-gray-200 hover:bg-gray-700 hover:text-white"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Options</span>
      </Button>
    </header>
  );
};

export default GameHeader;