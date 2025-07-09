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
      <DialogContent className="relative sm:max-w-lg bg-slate-900/80 backdrop-blur-sm border border-cyan-400/30 rounded-lg shadow-2xl shadow-cyan-500/10 text-white p-6 overflow-hidden">
        {/* Corner Brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-lg"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-lg"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/50 rounded-bl-lg"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/50 rounded-br-lg"></div>

        <DialogHeader className="text-center mb-4">
          <Trophy className="w-8 h-8 mx-auto text-cyan-300 mb-2" />
          <DialogTitle className="text-cyan-300 font-sans tracking-wide text-2xl">Classement</DialogTitle>
          <DialogDescription className="text-slate-300 mt-1">
            Top 10 des survivants les plus endurcis.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-40 text-center text-red-400">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p>{error}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b-cyan-400/20 hover:bg-transparent">
                  <TableHead className="text-slate-300 font-sans w-[50px]">Rang</TableHead>
                  <TableHead className="text-slate-300 font-sans">Joueur</TableHead>
                  <TableHead className="text-slate-300 font-sans">Zone</TableHead>
                  <TableHead className="text-right text-slate-300 font-sans">Jours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((player, index) => (
                  <TableRow key={index} className="border-b-slate-800 hover:bg-slate-800/40">
                    <TableCell className="font-medium text-cyan-300">#{index + 1}</TableCell>
                    <TableCell className="text-slate-200">{player.username}</TableCell>
                    <TableCell className="text-slate-400">{player.current_zone}</TableCell>
                    <TableCell className="text-right font-bold text-cyan-300">{player.days_alive}</TableCell>
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