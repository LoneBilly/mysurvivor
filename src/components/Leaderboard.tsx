import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldAlert, Trophy, Home, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  username: string | null;
  days_alive: number;
  base_location: string | null;
}

const formatZoneName = (name: string | null | undefined): string => {
  if (!name) return "Inconnue";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc('get_leaderboard_data');
        if (error) throw error;
        const filteredData = (data || []).filter((p: LeaderboardEntry) => p.base_location).slice(0, 10);
        setLeaderboard(filteredData);
      } catch (err: any) {
        console.error("Error fetching leaderboard:", err);
        setError("Impossible de charger le classement.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const topPlayer = leaderboard.length > 0 ? leaderboard[0] : null;
  const otherPlayers = leaderboard.length > 1 ? leaderboard.slice(1) : [];

  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center text-red-400">
          <ShieldAlert className="w-8 h-8 mb-2" />
          <p>{error}</p>
        </div>
      );
    }
    if (leaderboard.length === 0) {
      return <div className="text-center p-8 text-gray-400 h-64 flex items-center justify-center">Aucun survivant n'a encore bâti de base.</div>;
    }

    return (
      <div className="p-3 sm:p-4 space-y-3">
        {topPlayer && (
          <div className="p-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10">
            <div className="flex items-center gap-4">
              <Trophy className="w-10 h-10 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-mono text-yellow-400/80">#1 Survivant</p>
                <p className="text-xl font-bold text-white truncate">{topPlayer.username || 'Anonyme'}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
                <Home className="w-4 h-4 text-gray-400" />
                <span>Base: <span className="font-bold">{formatZoneName(topPlayer.base_location)}</span></span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <span><span className="font-bold">{topPlayer.days_alive}</span> jours</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-[235px] overflow-y-auto no-scrollbar">
          {otherPlayers.map((player, index) => {
            const rank = index + 2;
            return (
              <div key={rank} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="font-bold text-lg w-8 text-center flex-shrink-0 text-gray-400">
                      <span>#{rank}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{player.username || 'Anonyme'}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                        <Home size={12} /> {formatZoneName(player.base_location)}
                      </p>
                    </div>
                  </div>
                  <div className="text-center flex-shrink-0 w-16">
                    <p className="font-bold text-lg">{player.days_alive}</p>
                    <p className="text-xs text-gray-400">jours</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-md lg:max-w-lg bg-white/10 backdrop-blur-lg text-white border border-white/20 shadow-2xl rounded-2xl">
      <CardHeader className="text-center border-b border-white/20 p-4">
        <Trophy className="w-8 h-8 mx-auto text-white mb-2" />
        <CardTitle className="text-2xl text-white font-mono tracking-wider uppercase">Leaderboard</CardTitle>
        <CardDescription className="text-gray-400">Que les meilleurs vivent!</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;