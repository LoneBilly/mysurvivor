import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LaserButton from '@/components/LaserButton'; // Importez le nouveau composant

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 animate-pulse">
          SURVIVALIST
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Plongez dans un monde post-apocalyptique où chaque décision compte. Survivez, explorez, et construisez votre abri.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-4">
        <LaserButton // Utilisez LaserButton ici
          onClick={() => navigate('/login')}
          buttonClassName="w-full sm:w-auto rounded-none border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-150 hover:scale-[1.02] hover:shadow-[6px_6px_0px_#000] bg-black text-white hover:bg-gray-800 font-bold text-lg px-10 py-6"
        >
          Commencer l'aventure
        </LaserButton>
        <Button
          onClick={() => navigate('/leaderboard')}
          className="w-full sm:w-auto rounded-none border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-150 hover:scale-[1.02] hover:shadow-[6px_6px_0px_#000] bg-black text-white hover:bg-gray-800 font-bold text-lg px-10 py-6"
        >
          Voir le classement
        </Button>
      </div>

      <div className="mt-12 text-gray-400 text-sm">
        <p>&copy; 2024 Survivalist. Tous droits réservés.</p>
      </div>
    </div>
  );
}