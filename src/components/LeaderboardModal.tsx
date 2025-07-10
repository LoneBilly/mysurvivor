import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trophy } from "lucide-react";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaderboardModal = ({ isOpen, onClose }: LeaderboardModalProps) => {
  // Dummy data
  const leaderboardData = [
    { rank: 1, name: "SurvivorX", days: 124 },
    { rank: 2, name: "ApocalypseMaster", days: 110 },
    { rank: 3, name: "ZombieSlayer", days: 98 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Classement
          </DialogTitle>
          <DialogDescription>
            Les survivants les plus endurcis.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/20">
                <th className="p-2">Rang</th>
                <th className="p-2">Nom</th>
                <th className="p-2">Jours Survécu</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map(player => (
                <tr key={player.rank} className="border-b border-white/10">
                  <td className="p-2">{player.rank}</td>
                  <td className="p-2">{player.name}</td>
                  <td className="p-2">{player.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;