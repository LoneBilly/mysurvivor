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
    <Card className="w-full max-w-md lg:max-w-lg bg-white border-gray-200 shadow-xl">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <div>
            <CardTitle className="text-2xl text-gray-800">Classement</CardTitle>
            <CardDescription className="text-gray-600">Top 10 des survivants</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-40 text-center text-red-500">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p>{error}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead className="text-right">Jours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((player, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{player.username}</TableCell>
                    <TableCell className="text-gray-500">{player.current_zone}</TableCell>
                    <TableCell className="text-right font-bold">{player.days_alive}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;