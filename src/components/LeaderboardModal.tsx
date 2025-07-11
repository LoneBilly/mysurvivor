import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Loader2, Sun, MapPin, Shield } from 'lucide-react';
import { showError } from '@/utils/toast';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LeaderboardEntry = {
  username: string;
  current_zone: string;
  days_alive: number;
  base_location: string;
};

const LeaderboardModal = ({ isOpen, onClose }: LeaderboardModalProps) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchLeaderboard = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_leaderboard_data');
        if (error) {
          console.error('Error fetching leaderboard:', error);
          showError('Impossible de charger le classement.');
          setLeaderboardData([]);
        } else {
          setLeaderboardData(data || []);
        }
        setLoading(false);
      };
      fetchLeaderboard();
    }
  }, [isOpen]);

  const getRankClass = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-500/20 border-yellow-500 shadow-lg shadow-yellow-500/10';
      case 1: return 'bg-gray-400/20 border-gray-400 shadow-lg shadow-gray-400/10';
      case 2: return 'bg-orange-600/20 border-orange-600 shadow-lg shadow-orange-600/10';
      default: return 'bg-slate-700/50 border-slate-600';
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-8 h-8 mx-auto text-yellow-400" />;
      case 1: return <Trophy className="w-8 h-8 mx-auto text-gray-300" />;
      case 2: return <Trophy className="w-8 h-8 mx-auto text-orange-500" />;
      default: return <span className="text-xl font-bold">{index + 1}</span>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <DialogTitle className="text-2xl font-bold text-white tracking-wider">Classement</DialogTitle>
          </div>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {leaderboardData.length > 0 ? leaderboardData.map((player, index) => (
              <div key={index} className={`p-3 sm:p-4 rounded-lg border flex items-center gap-4 transition-all duration-300 hover:scale-105 ${getRankClass(index)}`}>
                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                  {getRankIcon(index)}
                </div>
                <div className="flex-grow">
                  <p className="text-md sm:text-lg font-semibold text-white">{player.username}</p>
                  <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-300 mt-1">
                    <span className="flex items-center gap-1.5"><Sun className="w-4 h-4" /> {player.days_alive} jours</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Zone: {player.current_zone || 'Inconnue'}</span>
                    <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Base: {player.base_location || 'Aucune'}</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-10">Le classement est actuellement vide.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;