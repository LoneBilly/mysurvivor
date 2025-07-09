import { Users } from 'lucide-react';

interface FloatingInfoBarProps {
  playerCount: number | null;
}

const FloatingInfoBar = ({ playerCount }: FloatingInfoBarProps) => {
  // Ce composant est maintenant utilisé sur la page d'accueil et non en jeu.
  // Il a été simplifié pour n'afficher que le nombre de joueurs.
  // Si vous avez besoin d'une barre d'info en jeu, nous pourrons en créer une nouvelle.
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-white/80 backdrop-blur-sm border-2 border-black rounded-none shadow-[4px_4px_0px_#000] px-4 py-2">
        <div className="flex items-center space-x-3">
          <Users className="w-5 h-5 text-black" />
          <p className="font-mono text-sm font-bold text-black">
            {playerCount !== null ? (
              <>
                <span className="animate-pulse">{playerCount}</span> survivants en jeu
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