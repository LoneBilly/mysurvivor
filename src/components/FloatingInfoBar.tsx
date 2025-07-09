import { Users, Trophy } from 'lucide-react';

interface FloatingInfoBarProps {
  playerCount: number | null;
  topPlayer: { username: string; days_alive: number } | null;
}

const FloatingInfoBar = ({ playerCount, topPlayer }: FloatingInfoBarProps) => {
  if (playerCount === null && !topPlayer) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none">
      <div className="container mx-auto max-w-4xl bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-3 rounded-none flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-6 pointer-events-auto">
        {playerCount !== null && (
          <div className="flex items-center gap-2 text-sm font-mono text-black">
            <Users className="w-5 h-5" />
            <span>Rejoignez <span className="font-bold">{playerCount}</span> survivants dans le jeu.</span>
          </div>
        )}
        {playerCount !== null && topPlayer && (
          <div className="hidden sm:block w-px h-6 bg-black" />
        )}
        {topPlayer && (
          <div className="flex items-center gap-2 text-sm font-mono text-black">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span>Top survivant : <span className="font-bold">{topPlayer.username}</span> ({topPlayer.days_alive} jours) !</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingInfoBar;