import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  progress: number;
  message: string;
}

const LoadingScreen = ({ progress, message }: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 text-white">
      <Loader2 className="w-12 h-12 animate-spin mb-6" />
      <h1 className="text-2xl font-bold mb-2">Chargement du jeu</h1>
      <p className="text-gray-400 mb-4">{message}</p>
      <div className="w-full max-w-md px-4">
        <Progress value={progress} className="w-full" />
      </div>
    </div>
  );
};

export default LoadingScreen;