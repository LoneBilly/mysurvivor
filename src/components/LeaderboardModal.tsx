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
import { Loader2, ShieldAlert } from 'lucide-react';

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
      <DialogContent className="sm:max-w-lg bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Classement</DialogTitle>
          <DialogDescription className="text-gray-400">
            Top 10 des survivants les plus endurcis.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-40 text-center text-red-400">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p>{error}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-gray-700/50">
                  <TableHead className="text-white w-[50px]">Rang</TableHead>
                  <TableHead className="text-white">Joueur</TableHead>
                  <TableHead className="text-white">Zone</TableHead>
                  <TableHead className="text-white text-right">Jours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((player, index) => (
                  <TableRow key={index} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{player.username}</TableCell>
                    <TableCell>{player.current_zone}</TableCell>
                    <TableCell className="text-right font-bold">{player.days_alive}</TableCell>
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