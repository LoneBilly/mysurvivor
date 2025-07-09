import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldAlert, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  username: string | null;
  jours_survecus: number;
  base_zone: { type: string } | null;
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
        // NOTE: This query fetches 'jours_survecus' directly from 'player_states'.
        // If the displayed numbers are incorrect, the issue likely lies in the
        // database itself, where the value isn't being updated by the game's logic.
        const { data, error } = await supabase
          .from('player_states')
          .select('username, jours_survecus, base_zone:map_layout!player_states_base_zone_id_fkey(type)')
          .not('base_zone_id', 'is', null)
          .order('jours_survecus', { ascending: false })
          .limit(10);

        if (error) throw error;

        setLeaderboard(data || []);
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
    <Card className="w-full max-w-md lg:max-w-lg bg-white text-black border-2 border-black shadow-[8px_8px_0px_#000] rounded-none">
      <CardHeader className="p-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-black" />
          <div>
            <CardTitle className="text-2xl text-black font-mono tracking-wider uppercase">Classement</CardTitle>
            <CardDescription className="text-gray-700">Top 10 des Survivants</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[60vh] overflow-y-auto border-t-2 border-black">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-black" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-40 text-center text-red-500">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p>{error}</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center p-8 text-gray-500">Aucun survivant classé.</div>
          ) : (
            <div>
              {/* Header for the list */}
              <div className="grid grid-cols-[auto,1fr,1fr,auto] gap-4 items-center p-4 font-mono text-sm uppercase text-gray-500 border-b-2 border-black bg-gray-50">
                <div className="w-8 text-center">#</div>
                <div>Survivant</div>
                <div>Base</div>
                <div className="text-right">Jours</div>
              </div>
              {/* List of players */}
              {leaderboard.map((player, index) => (
                <div
                  key={index}
                  className={cn(
                    "grid grid-cols-[auto,1fr,1fr,auto] gap-4 items-center p-4 border-b border-black last:border-b-0",
                    index === 0 ? "bg-yellow-100 font-bold" : "bg-white hover:bg-gray-50"
                  )}
                >
                  <div className="w-8 text-center font-bold text-black">
                    {index === 0 ? <Trophy className="w-5 h-5 mx-auto text-yellow-500" /> : index + 1}
                  </div>
                  <div className="text-black font-medium truncate" title={player.username || 'Anonyme'}>
                    {player.username || 'Anonyme'}
                  </div>
                  <div className="text-gray-700 truncate" title={formatZoneName(player.base_zone?.type)}>
                    {formatZoneName(player.base_zone?.type)}
                  </div>
                  <div className="text-right font-bold text-black">
                    {player.jours_survecus}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;