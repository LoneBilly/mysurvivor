import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, Trophy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LeaderboardEntry {
  username: string;
  days_alive: number;
  current_zone: string;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaderboardModal = ({ isOpen, onClose }: LeaderboardModalProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchLeaderboard = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('leaderboard')
          .select('username, days_alive, current_zone')
          .order('days_alive', { ascending: false })
          .limit(100);

        if (error) {
          showError('Impossible de charger le classement.');
          console.error(error);
        } else {
          setLeaderboard(data);
        }
        setLoading(false);
      };
      fetchLeaderboard();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center">
            <Trophy className="mr-2 text-yellow-400" /> Classement des Survivants
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Les plus grands survivants de notre monde.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-600 hover:bg-gray-700/50">
                  <TableHead className="w-[50px] text-center text-gray-300">#</TableHead>
                  <TableHead className="text-gray-300">Pseudo</TableHead>
                  <TableHead className="text-center text-gray-300">Zone</TableHead>
                  <TableHead className="text-right text-gray-300">Jours Survecus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry, index) => (
                  <TableRow key={entry.username + index} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                    <TableCell>{entry.username}</TableCell>
                    <TableCell className="text-center text-gray-400">{entry.current_zone}</TableCell>
                    <TableCell className="text-right font-semibold">{entry.days_alive}</TableCell>
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