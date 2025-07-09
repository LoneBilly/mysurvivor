import { Users } from 'lucide-react';

interface FloatingInfoBarProps {
  playerCount: number | null;
}

const FloatingInfoBar = ({ playerCount }: FloatingInfoBarProps) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[90vw] sm:w-auto">
      <div className="bg-white/80 backdrop-blur-sm border-2 border-black rounded-none shadow-[4px_4px_0px_#000] px-4 py-2 w-full">
        <div className="flex items-center justify-center sm:justify-start space-x-3">
          <Users className="w-5 h-5 text-black" />
          <p className="font-mono text-sm text-black">
            {playerCount !== null ? (
              <>
                <span className="animate-pulse font-semibold">{playerCount}</span> survivants en jeu
              </>
            ) : (
              'Calcul des survivants...'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FloatingInfoBar;