import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import FloatingInfoBar from '@/components/FloatingInfoBar';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-mono">
      <main className="flex-grow flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4">
          <span className="text-red-600">ZOMBIE</span> SURVIVAL
        </h1>
        <p className="max-w-2xl text-lg md:text-xl text-gray-600 mb-8">
          Un jeu de survie multijoueur post-apocalyptique. Explorez, construisez, et survivez. Chaque décision compte.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4">
          <Button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto rounded-none border-2 border-black shadow-[4px_4px_0px_#000] bg-red-600 text-white font-bold text-lg px-10 py-6 transition-all hover:bg-red-700 hover:shadow-[6px_6px_0px_#000] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
          >
            JOUER MAINTENANT
          </Button>
          <Button
            onClick={() => navigate('/leaderboard')}
            className="w-full sm:w-auto rounded-none border-2 border-black bg-transparent text-red-600 font-bold text-lg px-10 py-6 transition-all hover:bg-red-100"
          >
            CLASSEMENT
          </Button>
        </div>
      </main>
      <FloatingInfoBar />
    </div>
  );
};

export default Landing;