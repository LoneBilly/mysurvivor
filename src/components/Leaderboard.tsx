import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <Card className="w-full max-w-md lg:max-w-lg bg-white text-black border-2 border-black shadow-[8px_8px_0px_#000] rounded-none">
      <CardHeader className="p-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-black" />
          <div>
            <CardTitle className="text-2xl text-black font-mono tracking-wider uppercase">Classement</CardTitle>
            <CardDescription className="text-gray-700">Top 10 des plus endurcis</CardDescription>
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-black hover:bg-gray-100">
                  <TableHead className="w-[50px] text-black font-mono">#</TableHead>
                  <TableHead className="text-black font-mono">Joueur</TableHead>
                  <TableHead className="text-black font-mono">Zone</TableHead>
                  <TableHead className="text-right text-black font-mono">Jours</TableHead>
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
                    <TableCell className="text-black font-medium">{player.username}</TableCell>
                    <TableCell className="text-gray-700">{player.current_zone}</TableCell>
                    <TableCell className="text-right font-bold text-black">{player.days_alive}</TableCell>
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