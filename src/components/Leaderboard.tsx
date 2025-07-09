import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldAlert, Trophy, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  return (
    <Card className="w-full max-w-md lg:max-w-lg bg-gray-900/50 text-white border-2 border-gray-700 shadow-[8px_8px_0px_#4a5568] rounded-none backdrop-blur-sm">
      <CardHeader className="p-6 border-b-2 border-gray-700">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <div>
            <CardTitle className="text-2xl text-white font-mono tracking-wider uppercase">Classement des Survivants</CardTitle>
            <CardDescription className="text-gray-400">Les légendes des terres désolées.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-40 text-center text-red-500">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p>{error}</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center p-8 text-gray-500">Aucun survivant classé.</div>
          ) : (
            <div className="divide-y-2 divide-gray-800">
              {leaderboard.map((player, index) => {
                const rank = index + 1;
                const rankStyling =
                  rank === 1 ? "bg-yellow-500/10 border-l-4 border-yellow-400" :
                  rank === 2 ? "bg-gray-500/10 border-l-4 border-gray-400" :
                  rank === 3 ? "bg-orange-500/10 border-l-4 border-orange-400" :
                  "border-l-4 border-transparent";

                return (
                  <div key={index} className={cn("p-4 flex items-center space-x-4 transition-all hover:bg-gray-800/50", rankStyling)}>
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className={cn("text-2xl font-bold font-mono", rank === 1 && "text-yellow-300", rank === 2 && "text-gray-300", rank === 3 && "text-orange-300")}>
                        {rank}
                      </span>
                    </div>
                    
                    <Avatar className="w-12 h-12 border-2 border-gray-600">
                      <AvatarImage src={`https://api.dicebear.com/8.x/pixel-art/svg?seed=${player.username || 'Anonyme'}`} />
                      <AvatarFallback>{player.username?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>

                    <div className="flex-grow min-w-0">
                      <p className="text-lg font-bold text-white truncate">{player.username || 'Anonyme'}</p>
                      <div className="flex items-center text-sm text-gray-400 mt-1">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{formatZoneName(player.base_location)}</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="text-xl font-bold text-white">{player.days_alive}</p>
                      <p className="text-xs text-gray-500 font-mono">JOURS</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;