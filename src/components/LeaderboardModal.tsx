import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldAlert, Trophy } from 'lucide-react';

interface LeaderboardEntry {
  username: string;
  current_zone: string;
  days_alive: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaderboardModal = ({ isOpen, onClose }: LeaderboardModalProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
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
          setError("Impossible de charger le classement. Veuillez réessayer.");
        } finally {
          setLoading(false);
        }
      };

      fetchLeaderboard();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000] rounded-none p-6">
        <DialogHeader className="text-center mb-4">
          <Trophy className="w-8 h-8 mx-auto text-black mb-2" />
          <DialogTitle className="text-black font-mono tracking-wider uppercase text-xl">Classement</DialogTitle>
          <DialogDescription className="text-gray-700 mt-1">
            Top 10 des survivants les plus endurcis.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto border-2 border-black">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-black" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-40 text-center text-red-500 p-4">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p>{error}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-black hover:bg-gray-100">
                  <TableHead className="text-black font-mono w-[50px]">Rang</TableHead>
                  <TableHead className="text-black font-mono">Joueur</TableHead>
                  <TableHead className="text-black font-mono">Zone</TableHead>
                  <TableHead className="text-right text-black font-mono">Jours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((player, index) => (
                  <TableRow key={index} className="border-b border-black last:border-b-0 hover:bg-gray-100">
                    <TableCell className="font-bold text-black">#{index + 1}</TableCell>
                    <TableCell className="text-black">{player.username}</TableCell>
                    <TableCell className="text-gray-700">{player.current_zone}</TableCell>
                    <TableCell className="text-right font-bold text-black">{player.days_alive}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;