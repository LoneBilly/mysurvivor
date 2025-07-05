import { useState } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import { GameStats } from "@/types/game";
import { showSuccess, showError } from "@/utils/toast";

const GameInterface = () => {
  const [joursSurvecus, setJoursSurvecus] = useState(1);
  const [stats, setStats] = useState<GameStats>({
    vie: 100,
    faim: 80,
    soif: 70,
    energie: 90
  });

  const handleCellSelect = (x: number, y: number) => {
    showSuccess(`Case sélectionnée : ${x}, ${y}`);
    // Ici vous pourrez ajouter la logique de découverte des cases
  };

  const handleLeaderboard = () => {
    showSuccess("Ouverture du classement");
    // Logique pour afficher le leaderboard
  };

  const handleOptions = () => {
    showSuccess("Ouverture des options");
    // Logique pour afficher les options
  };

  const handleInventaire = () => {
    showSuccess("Ouverture de l'inventaire");
    // Logique pour afficher l'inventaire
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <GameHeader
        joursSurvecus={joursSurvecus}
        onLeaderboard={handleLeaderboard}
        onOptions={handleOptions}
      />
      
      <main className="flex-1 flex flex-col">
        <GameGrid onCellSelect={handleCellSelect} />
      </main>
      
      <GameFooter
        stats={stats}
        onInventaire={handleInventaire}
      />
    </div>
  );
};

export default GameInterface;