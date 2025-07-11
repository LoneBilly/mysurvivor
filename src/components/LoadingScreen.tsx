import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  progress: number;
  message: string;
}

const LoadingScreen = ({ progress, message }: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 text-white p-4">
      <div className="w-full max-w-sm text-center">
        <Loader2 className="w-12 h-12 animate-spin mb-6 mx-auto" />
        <h1 className="text-2xl font-bold mb-2">Chargement du jeu</h1>
        <div className="flex items-baseline justify-center gap-2 h-10">
          <p className="text-gray-400">{message}</p>
          <p className="text-gray-400 font-thin text-sm">{Math.round(progress)}%</p>
        </div>
        <Progress value={progress} className="w-full h-1" />
      </div>
    </div>
  );
};

export default LoadingScreen;