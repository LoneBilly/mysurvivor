import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy } from 'lucide-react';

interface LeaderboardData {
  username: string;
  current_zone: string;
  days_alive: number;
  base_location: string | null;
}

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_leaderboard_data');
      if (error) {
        console.error('Error fetching leaderboard data:', error);
      } else {
        setLeaderboardData(data || []);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  return (
    <Card className="w-full max-w-md lg:max-w-lg bg-white text-black border-2 border-black shadow-[8px_8px_0px_#000] rounded-none">
      <CardHeader className="p-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-black" />
          <CardTitle className="text-2xl font-bold">Classement</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-center">Chargement...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left w-16">#</TableHead>
                <TableHead className="text-left">Joueur</TableHead>
                <TableHead className="text-left">Base</TableHead>
                <TableHead className="text-left">Jours Survécu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((player, index) => (
                <TableRow key={index}>
                  <TableCell className="text-left font-medium">{index + 1}</TableCell>
                  <TableCell className="text-left">{player.username}</TableCell>
                  <TableCell className="text-left">{player.base_location || 'N/A'}</TableCell>
                  <TableCell className="text-left">{player.days_alive}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;