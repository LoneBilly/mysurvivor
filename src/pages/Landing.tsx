import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import FloatingInfoBar from "@/components/FloatingInfoBar";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-[url('/background.png')]">
      <div className="min-h-screen bg-black/60 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4" style={{ textShadow: '4px 4px 0px #000' }}>
            SURVIVOR
          </h1>
          <p className="text-xl md:text-2xl font-light max-w-3xl mb-8">
            Un jeu de survie multijoueur post-apocalyptique où chaque décision compte. Explorez, construisez et survivez face aux hordes de zombies et aux autres joueurs.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            <Button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto rounded-lg bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold text-xl px-12 py-6 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105"
            >
              REJOINDRE L'AVENTURE
            </Button>
          </div>
        </div>
        <FloatingInfoBar />
      </div>
    </div>
  );
}