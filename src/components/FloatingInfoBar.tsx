import { Users } from 'lucide-react';

interface FloatingInfoBarProps {
  playerCount: number | null;
}

const FloatingInfoBar = ({ playerCount }: FloatingInfoBarProps) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-auto">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg px-4 py-2">
        <div className="flex items-center justify-center sm:justify-start space-x-3">
          <Users className="w-5 h-5 text-white" />
          <p className="font-mono text-sm text-white">
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