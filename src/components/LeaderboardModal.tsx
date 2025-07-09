import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LeaderboardEntry {
  username: string;
  base_location: string;
  days_alive: number;
}

const LeaderboardModal = ({ isOpen, onClose }: LeaderboardModalProps) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchLeaderboard = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_leaderboard_data');
        
        if (error) {
          console.error('Error fetching leaderboard data:', error);
        } else if (data) {
          setLeaderboardData(data);
        }
        setLoading(false);
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
        </DialogHeader>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center py-8">Chargement du classement...</p>
          ) : leaderboardData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b-black hover:bg-gray-100">
                  <TableHead className="text-black font-mono uppercase">Rang</TableHead>
                  <TableHead className="text-black font-mono uppercase">Pseudo</TableHead>
                  <TableHead className="text-black font-mono uppercase">Base</TableHead>
                  <TableHead className="text-right text-black font-mono uppercase">Jours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((player, index) => (
                  <TableRow key={index} className="border-b-black/20 hover:bg-gray-50">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{player.username}</TableCell>
                    <TableCell>{player.base_location || 'Inconnue'}</TableCell>
                    <TableCell className="text-right">{player.days_alive}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8">Le classement est actuellement vide.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;