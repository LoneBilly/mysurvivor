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
      return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-black" /></div>;
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center text-red-500">
          <ShieldAlert className="w-8 h-8 mb-2" />
          <p>{error}</p>
        </div>
      );
    }
    if (leaderboard.length === 0) {
      return <div className="text-center p-8 text-gray-500 h-64 flex items-center justify-center">Aucun survivant n'a encore bâti de base.</div>;
    }

    return (
      <div className="p-3 sm:p-4 space-y-3">
        {topPlayer && (
          <div className="p-4 rounded-none border-2 border-yellow-400 bg-yellow-100 shadow-[4px_4px_0px_#facc15]">
            <div className="flex items-center gap-4">
              <Trophy className="w-10 h-10 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-mono text-yellow-700">#1 Survivant</p>
                <p className="text-xl font-bold text-black truncate">{topPlayer.username || 'Anonyme'}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-white/50 rounded-none border border-yellow-300">
                <Home className="w-4 h-4 text-gray-600" />
                <span>Base: <span className="font-bold">{formatZoneName(topPlayer.base_location)}</span></span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white/50 rounded-none border border-yellow-300">
                <CalendarDays className="w-4 h-4 text-gray-600" />
                <span><span className="font-bold">{topPlayer.days_alive}</span> jours</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-[235px] overflow-y-auto no-scrollbar">
          {otherPlayers.map((player, index) => {
            const rank = index + 2;
            const rankInfo = {
              2: { bgColor: "bg-gray-100" },
              3: { bgColor: "bg-orange-100" },
            }[rank];

            return (
              <div key={rank} className={cn("p-3 rounded-none border-2 border-black", rankInfo?.bgColor || "bg-white")}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="font-bold text-lg w-8 text-center flex-shrink-0">
                      <span>#{rank}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{player.username || 'Anonyme'}</p>
                      <p className="text-xs text-gray-600 flex items-center gap-1 truncate">
                        <Home size={12} /> {formatZoneName(player.base_location)}
                      </p>
                    </div>
                  </div>
                  <div className="text-center flex-shrink-0 w-16">
                    <p className="font-bold text-lg">{player.days_alive}</p>
                    <p className="text-xs text-gray-600">jours</p>
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
    <Card className="w-full max-w-md lg:max-w-lg bg-white text-black border-2 border-black shadow-[8px_8px_0px_#000] rounded-none">
      <CardHeader className="text-center border-b-2 border-black p-4">
        <Trophy className="w-8 h-8 mx-auto text-black mb-2" />
        <CardTitle className="text-2xl text-black font-mono tracking-wider uppercase">Leaderboard</CardTitle>
        
      </CardHeader>
      <CardContent className="p-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;