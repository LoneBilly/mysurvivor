import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Leaderboard from '@/components/Leaderboard';
import TestimonialCarousel from '@/components/TestimonialCarousel';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert, Map, Home, Swords, Package, Users, Trophy } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [topPlayer, setTopPlayer] = useState<{ username: string; days_alive: number } | null>(null);

  useEffect(() => {
    const fetchLandingData = async () => {
      // Fetch player count
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (countError) console.error("Error fetching player count:", countError);
      else setPlayerCount(count);

      // Fetch top player
      const { data: topPlayerData, error: topPlayerError } = await supabase
        .from('leaderboard')
        .select('username, days_alive')
        .order('days_alive', { ascending: false })
        .limit(1)
        .single();
      if (topPlayerError && topPlayerError.code !== 'PGRST116') { // Ignore "No rows found" error
        console.error("Error fetching top player:", topPlayerError);
      } else {
        setTopPlayer(topPlayerData);
      }
    };

    fetchLandingData();
  }, []);

  const features = [
    { icon: Map, title: "Explorez", description: "Découvrez un monde en ruines, zone par zone, et révélez ses secrets." },
    { icon: Home, title: "Construisez", description: "Établissez votre campement et transformez-le en une base imprenable." },
    { icon: Package, title: "Lootez", description: "Fouillez les décombres pour trouver des ressources et des objets précieux." },
    { icon: Swords, title: "Survivez", description: "Affrontez les autres survivants dans un environnement où chaque rencontre est décisive." },
  ];

  return (
    <div className="min-h-screen bg-gray-100 text-black flex flex-col items-center p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="w-full max-w-5xl text-center py-16 sm:py-24">
        <ShieldAlert className="w-16 h-16 mx-auto text-black mb-6 animate-pulse" />
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-black font-mono tracking-wider uppercase">
          SURVIVE THE XTINCTION
        </h1>
        <p className="text-gray-700 mt-4 text-lg max-w-3xl mx-auto">
          Incarnez votre propre survivant dans un monde post-apocalyptique impitoyable. Explorez, construisez, et luttez pour votre place dans ce qui reste de l'humanité.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4">
          <Button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto rounded-none border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all bg-black text-white hover:bg-gray-800 font-bold text-lg px-10 py-6"
          >
            COMMENCER L'AVENTURE
          </Button>
          {playerCount !== null && (
            <div className="flex items-center gap-2 text-sm font-mono bg-white border-2 border-black px-4 py-2">
              <Users className="w-5 h-5" />
              <span>Rejoignez <span className="font-bold">{playerCount}</span> survivants dans le jeu.</span>
            </div>
          )}
        </div>
        {topPlayer && (
          <div className="mt-8 w-full max-w-md bg-yellow-100 border-2 border-black p-4 text-center shadow-[4px_4px_0px_#000]">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <p className="font-mono text-black">
                Le N°1 est <span className="font-bold">{topPlayer.username}</span> avec <span className="font-bold">{topPlayer.days_alive}</span> jours de survie !
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="w-full max-w-6xl py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-6 bg-white border-2 border-black rounded-none shadow-[6px_6px_0px_#000]">
              <feature.icon className="w-12 h-12 mx-auto text-black mb-4" />
              <h3 className="text-xl font-bold font-mono uppercase text-black">{feature.title}</h3>
              <p className="text-gray-600 mt-2">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full flex flex-col items-center py-16">
        <h2 className="text-3xl font-bold text-center mb-2 font-mono uppercase">Échos des Terres Désolées</h2>
        <p className="text-gray-600 text-center mb-12">Ils ont survécu. Pour l'instant.</p>
        <TestimonialCarousel />
      </section>

      {/* Leaderboard Section */}
      <section className="w-full max-w-5xl flex flex-col items-center py-16">
        <Leaderboard />
      </section>

      {/* Final CTA Section */}
      <section className="w-full max-w-5xl text-center py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-black font-mono tracking-wider uppercase">
          Prêt à laisser votre marque ?
        </h2>
        <p className="text-gray-700 mt-4 text-lg max-w-2xl mx-auto">
          Le monde ne vous attendra pas. Chaque seconde compte. Rejoignez les rangs des survivants et forgez votre propre légende.
        </p>
        <Button 
          onClick={() => navigate('/login')}
          className="mt-8 rounded-none border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all bg-black text-white hover:bg-gray-800 font-bold text-lg px-12 py-6"
        >
          JOUER MAINTENANT
        </Button>
      </section>

    </div>
  );
};

export default Landing;