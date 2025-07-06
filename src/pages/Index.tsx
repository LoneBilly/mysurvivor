"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import GameHeader from "@/components/GameHeader";
import GameMap from "@/components/GameMap";
import BaseView from "@/components/BaseView";
import LeaderboardModal from "@/components/LeaderboardModal";

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'map' | 'base'>('map');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setSession(session);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        setProfile(profileData);
      }
      
      setLoading(false);
    };

    getInitialData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (session) {
        setSession(session);
        getInitialData();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleToggleView = () => {
    setCurrentView(prev => prev === 'map' ? 'base' : 'map');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Chargement de votre partie...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <GameHeader
        username={profile?.username || session?.user?.email || null}
        onLogout={handleLogout}
        currentView={currentView}
        onToggleView={handleToggleView}
        onLeaderboard={() => setIsLeaderboardOpen(true)}
      />
      <main className="flex-grow overflow-auto">
        {currentView === 'map' ? <GameMap /> : <BaseView />}
      </main>
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
    </div>
  );
}