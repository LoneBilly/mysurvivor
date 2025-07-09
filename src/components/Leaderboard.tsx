import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  username: string;
  current_zone: string;
  days_alive: number;
  base_location: string | null;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase.rpc('get_leaderboard_data');

      if (error) {
        console.error("Erreur lors de la récupération du classement:", error);
        setError("Impossible de charger le classement.");
      } else if (data) {
        setLeaderboard(data);
      }
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
        {error ? (
          <p className="p-6 text-red-500">{error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-black">
                <TableHead className="w-[40px] text-left font-bold text-black">#</TableHead>
                <TableHead className="text-left font-bold text-black">Joueur</TableHead>
                <TableHead className="text-left font-bold text-black">Base</TableHead>
                <TableHead className="text-right font-bold text-black">Jours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length > 0 ? (
                leaderboard.map((player, index) => (
                  <TableRow key={index} className="border-t border-black/20">
                    <TableCell className="font-medium text-left">{index + 1}</TableCell>
                    <TableCell className="text-left">{player.username}</TableCell>
                    <TableCell className="text-left">{player.base_location || 'N/A'}</TableCell>
                    <TableCell className="text-right">{player.days_alive}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Le classement est vide.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}