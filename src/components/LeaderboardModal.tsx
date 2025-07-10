import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchLeaderboard = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_leaderboard_data');

        if (error) {
          console.error("Error fetching leaderboard:", error);
          setLeaderboard([]);
        } else {
          setLeaderboard(data as LeaderboardEntry[]);
        }
        setLoading(false);
      };

      fetchLeaderboard();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="mb-4">
          <div className="flex flex-col items-center">
            <Trophy className="w-8 h-8 text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Classement</DialogTitle>
          </div>
        </DialogHeader>
        {loading ? (
          <p className="text-center">Chargement...</p>
        ) : (
          <div>
            {/* Mobile View */}
            <div className="md:hidden font-mono space-y-4">
              {leaderboard.map((entry, index) => (
                <div key={index} className="border-b-2 border-white/10 pb-2 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg truncate">#{index + 1} {entry.username}</p>
                    <p className="text-lg whitespace-nowrap">{entry.days_alive} jours</p>
                  </div>
                  <p className="text-sm text-gray-400">Base: {entry.base_location || 'N/A'}</p>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="border-b-2 border-white/20">
                    <th className="p-2">Rang</th>
                    <th className="p-2">Pseudo</th>
                    <th className="p-2">Base</th>
                    <th className="p-2 text-right">Jours de Survie</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={index} className="border-b border-white/10 last:border-b-0">
                      <td className="p-2 font-bold">#{index + 1}</td>
                      <td className="p-2 truncate">{entry.username}</td>
                      <td className="p-2">{entry.base_location || 'N/A'}</td>
                      <td className="p-2 text-right">{entry.days_alive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;