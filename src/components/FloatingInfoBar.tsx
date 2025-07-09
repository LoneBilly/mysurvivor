import { Users } from 'lucide-react';

interface FloatingInfoBarProps {
  playerCount: number | null;
}

const FloatingInfoBar = ({ playerCount }: FloatingInfoBarProps) => {
  if (playerCount === null) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none">
      <div className="container mx-auto max-w-4xl bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-3 rounded-none flex items-center justify-center gap-2 sm:gap-6 pointer-events-auto">
        {playerCount !== null && (
          <div className="flex items-center gap-2 text-sm font-mono text-black">
            <Users className="w-5 h-5" />
            <span>Rejoignez <span className="font-bold">{playerCount}</span> survivants dans le jeu.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingInfoBar;