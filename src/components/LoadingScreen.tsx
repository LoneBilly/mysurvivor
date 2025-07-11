import { useState, useEffect } from 'react';
import { Loader2 } from "lucide-react";

const loadingMessages = [
  "Chargement des ressources...",
  "Préparation des événements aléatoires...",
  "Synchronisation de l'inventaire...",
  "Vérification des constructions de base...",
  "Chargement de la carte du monde...",
  "Affûtage des haches...",
];

const LoadingScreen = () => {
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    let messageIndex = 0;
    const intervalId = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setCurrentMessage(loadingMessages[messageIndex]);
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="landing-page-bg fixed inset-0 flex flex-col items-center justify-center z-50 text-white p-4">
      <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      <p className="mt-4 text-base text-gray-200 text-center">{currentMessage}</p>
    </div>
  );
};

export default LoadingScreen;