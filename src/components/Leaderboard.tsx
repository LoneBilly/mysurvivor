import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, Trophy } from 'lucide-react';

interface LeaderboardEntry {
  username: string;
  current_zone: string;
  days_alive: number;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('username, current_zone, days_alive')
          .order('days_alive', { ascending: false })
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
    <div className="w-full max-w-md lg:max-w-lg bg-black/30 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-2xl shadow-black/50">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-amber-400" />
          <div>
            <CardTitle className="text-2xl text-gray-100">Classement des Survivants</CardTitle>
            <CardDescription className="text-gray-400">Top 10 des plus endurcis</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-40 text-center text-red-400">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p>{error}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b-gray-700 hover:bg-transparent">
                  <TableHead className="w-[50px] text-gray-300">#</TableHead>
                  <TableHead className="text-gray-300">Joueur</TableHead>
                  <TableHead className="text-gray-300">Zone</TableHead>
                  <TableHead className="text-right text-gray-300">Jours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((player, index) => (
                  <TableRow key={index} className="border-b-gray-800 hover:bg-gray-800/40">
                    <TableCell className="font-medium text-gray-200">{index + 1}</TableCell>
                    <TableCell className="text-gray-200">{player.username}</TableCell>
                    <TableCell className="text-gray-400">{player.current_zone}</TableCell>
                    <TableCell className="text-right font-bold text-amber-400">{player.days_alive}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </div>
  );
};

export default Leaderboard;