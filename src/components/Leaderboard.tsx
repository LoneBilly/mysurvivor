import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, Trophy } from 'lucide-react';
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

        // Filtrer pour les joueurs avec une base et prendre le top 10
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
    <Card className="w-full max-w-md lg:max-w-lg bg-white text-black border-2 border-black shadow-[8px_8px_0px_#000] rounded-none">
      <CardHeader className="p-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-black" />
          <div>
            <CardTitle className="text-2xl text-black font-mono tracking-wider uppercase">Classement</CardTitle>
            <CardDescription className="text-gray-700">Top 10 des bâtisseurs</CardDescription>
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
            <>
              {/* Vue Mobile */}
              <div className="md:hidden">
                {leaderboard.map((player, index) => (
                  <div key={index} className={cn("grid grid-cols-12 items-center p-4 border-b border-black last:border-b-0", index === 0 && "bg-yellow-100")}>
                    <div className="col-span-1 font-bold text-black flex items-center justify-center">
                      {index === 0 ? <Trophy className="w-5 h-5 text-yellow-500" /> : `#${index + 1}`}
                    </div>
                    <div className="col-span-7 pl-2">
                      <p className="font-medium text-black truncate">{player.username || 'Anonyme'}</p>
                      <p className="text-sm text-gray-600 truncate">Base: {formatZoneName(player.base_location)}</p>
                    </div>
                    <div className="col-span-4 text-left pl-2">
                      <p className="font-bold text-black">{player.days_alive}</p>
                      <p className="text-sm text-gray-600">Jours</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vue Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-black hover:bg-gray-100">
                      <TableHead className="w-[50px] text-black font-mono">#</TableHead>
                      <TableHead className="text-black font-mono">Joueur</TableHead>
                      <TableHead className="text-black font-mono">Base</TableHead>
                      <TableHead className="text-black font-mono">Jours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((player, index) => (
                      <TableRow 
                        key={index} 
                        className={cn(
                          "border-b border-black last:border-b-0 hover:bg-gray-100",
                          index === 0 && "bg-yellow-100 hover:bg-yellow-200 border-b-2 border-yellow-400"
                        )}
                      >
                        <TableCell className="font-bold text-black">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                            <span>#{index + 1}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-black font-medium">{player.username || 'Anonyme'}</TableCell>
                        <TableCell className="text-gray-700">{formatZoneName(player.base_location)}</TableCell>
                        <TableCell className="font-bold text-black">{player.days_alive}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;