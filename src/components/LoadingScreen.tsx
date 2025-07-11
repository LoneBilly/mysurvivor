import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message: string;
}

const LoadingScreen = ({ message }: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 text-white p-4">
      <div className="w-full max-w-sm text-center">
        <Loader2 className="w-12 h-12 animate-spin mb-6 mx-auto" />
        <h1 className="text-2xl font-bold mb-2">Chargement du jeu</h1>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;