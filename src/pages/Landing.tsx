import { useNavigate } from 'react-router-dom';
import Leaderboard from '@/components/Leaderboard';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 text-black flex flex-col items-center justify-center p-4 lg:p-8">
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
        
        {/* Section de gauche : Présentation */}
        <div className="w-full max-w-md lg:max-w-lg text-center lg:text-left">
          <ShieldAlert className="w-16 h-16 mx-auto lg:mx-0 text-black mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold text-black font-mono tracking-wider uppercase">
            SURVIVE THE XTINCTION
          </h1>
          <p className="text-gray-700 mt-4 text-lg">
            Le monde n'est plus que l'ombre de lui-même. Chaque lever de soleil est une victoire, chaque ressource une bénédiction. Explorez des ruines désolées, construisez votre abri et mesurez-vous aux autres survivants.
          </p>
          <p className="text-gray-700 mt-2 text-lg font-semibold">
            Combien de jours tiendrez-vous ?
          </p>
          <Button 
            onClick={() => navigate('/login')}
            className="mt-8 w-full lg:w-auto rounded-none border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all bg-black text-white hover:bg-gray-800 font-bold text-lg px-10 py-6"
          >
            JOUER
          </Button>
        </div>

        {/* Section de droite : Classement */}
        <div className="w-full max-w-md lg:max-w-lg">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Landing;