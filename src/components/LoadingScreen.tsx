import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message: string;
}

const LoadingScreen = ({ message }: LoadingScreenProps) => {
  return (
    <div className="landing-page-bg fixed inset-0 flex flex-col items-center justify-center z-50 text-white p-4">
      <div className="bg-black/50 p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-gray-300" />
        <p className="text-lg font-semibold text-gray-200 text-center">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;