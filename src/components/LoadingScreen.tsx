import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message: string;
}

const LoadingScreen = ({ message }: LoadingScreenProps) => {
  return (
    <div className="landing-page-bg fixed inset-0 flex flex-col items-center justify-center z-50 text-white p-4">
      <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      <p className="mt-4 text-base font-semibold text-gray-200 text-center">{message}</p>
    </div>
  );
};

export default LoadingScreen;