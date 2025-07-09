import { Users, Trophy } from 'lucide-react';

interface FloatingInfoBarProps {
  playerCount: number | null;
  topPlayer: { username: string; days_alive: number } | null;
}

const FloatingInfoBar = ({ playerCount, topPlayer }: FloatingInfoBarProps) => {
  if (playerCount === null && topPlayer === null) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md sm:w-auto bg-white/80 backdrop-blur-sm text-black border-2 border-black shadow-[4px_4px_0px_#000] rounded-none p-2 sm:p-3 z-50">
      <div className="flex items-center justify-center divide-x-2 divide-black">
        {playerCount !== null && (
          <div className="flex items-center gap-2 px-3">
            <Users className="w-5 h-5" />
            <span className="font-mono text-sm">
              <span className="font-bold">{playerCount}</span> survivants
            </span>
          </div>
        )}
        {topPlayer && (
          <div className="hidden sm:flex items-center gap-2 px-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-mono text-sm">
              Top: <span className="font-bold">{topPlayer.username}</span> ({topPlayer.days_alive}j)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingInfoBar;