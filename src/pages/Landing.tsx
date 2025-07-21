import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Leaderboard from '@/components/Leaderboard';
import TestimonialCarousel from '@/components/TestimonialCarousel';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert, Map, Home, Swords, Package } from 'lucide-react';
import FloatingInfoBar from '@/components/FloatingInfoBar';

const Landing = () => {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  useEffect(() => {
    document.body.classList.add('landing-page-bg');
    return () => {
      document.body.classList.remove('landing-page-bg');
    };
  }, []);

  useEffect(() => {
    const fetchLandingData = async () => {
      // Fetch player count
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (countError) console.error("Error fetching player count:", countError);
      else setPlayerCount(count);
    };

    fetchLandingData();
  }, []);

  const features = [
    { icon: Map, title: "Explorez", description: "Découvrez un monde en ruines, zone par zone, et révélez ses secrets." },
    { icon: Home, title: "Construisez", description: "Établissez votre campement et transformez-le en une base imprenable." },
    { icon: Package, title: "Lootez & Commercez", description: "Ramassez tout ce dont vous avez besoin pour votre survie et vendez le reste sur le marché des survivants." },
    { icon: Swords, title: "Survivez", description: "Affrontez les autres joueurs dans un PvP asynchrone stratégique. Serveur 100% online, 100% PvP." },
  ];

  return (
    <div className="min-h-screen text-white flex flex-col items-center p-4 sm:p-6 lg:p-8 overflow-x-hidden pb-28 sm:pb-24">
      
      {/* Hero Section */}
      <section className="w-full max-w-5xl text-center py-16 sm:py-24">
        <ShieldAlert className="w-16 h-16 mx-auto text-white mb-6 animate-pulse" />
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white font-mono tracking-wider uppercase">
          RIVALIST
        </h1>
        <p className="text-gray-300 mt-4 text-lg max-w-3xl mx-auto">
          Incarne ton propre survivant dans un monde hostile. La devise de Rivalist? Tué ou être tué! Tu es maître de ton destin dans cette simulation de survie sur navigateur 100% multijoueur. Deviens le meilleur survivant et défend ton campement contre tous les survivants qui voudraient ta peau.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4">
          <Button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-lg px-10 py-6 transition-all hover:bg-white/20 animate-button-glow"
          >
            COMMENCER L'AVENTURE
          </Button>
          <p className="text-sm text-gray-400 mt-2">
            Inscription 100% gratuite, 100 crédits offerts
          </p>
        </div>
        <div className="mt-16 w-full flex justify-center">
          <Leaderboard />
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-6xl py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-lg h-full">
              <feature.icon className="w-12 h-12 mx-auto text-white mb-4" />
              <h3 className="text-xl font-bold font-mono uppercase text-white">{feature.title}</h3>
              <p className="text-gray-400 mt-2">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full flex flex-col items-center py-16">
        <h2 className="text-3xl font-bold text-center mb-2 font-mono uppercase">Échos des Survivants</h2>
        <p className="text-gray-400 text-center mb-12">Ils ont survécu. Pour l'instant.</p>
        <TestimonialCarousel />
      </section>

      {/* Final CTA Section */}
      <section className="w-full max-w-5xl text-center py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-white font-mono tracking-wider uppercase">
          As-tu réellement les capacités d'un survivant?
        </h2>
        <p className="text-gray-300 mt-4 text-lg max-w-2xl mx-auto">
          Incarne ton personnage et sois le top 1 des survivants de Rivalist!
        </p>
        <Button 
          onClick={() => navigate('/login')}
          className="mt-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-lg px-12 py-6 transition-all hover:bg-white/20"
        >
          JOUER MAINTENANT
        </Button>
      </section>

      <FloatingInfoBar playerCount={playerCount} />
    </div>
  );
};

export default Landing;