import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ItemIcon from "./ItemIcon";
import { useGame } from "@/contexts/GameContext";
import { DiscoverableZone } from "@/types/game";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

interface InfoDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string | null;
  icon: string | null;
  adjacentZones?: DiscoverableZone[] | null;
  boostInfo?: { total: number; sources: string[] } | null;
}

const InfoDisplayModal = ({ isOpen, onClose, title, description, icon, adjacentZones, boostInfo }: InfoDisplayModalProps) => {
  const { getIconUrl } = useGame();
  const iconUrl = getIconUrl(icon);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-700/50 border-slate-600 flex-shrink-0 relative p-1">
              <ItemIcon iconName={iconUrl || icon} alt={title} />
            </div>
            <div>
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4">
          {description ? (
            <p className="text-gray-300">{description}</p>
          ) : (
            <p className="text-gray-400 italic">Aucune description disponible.</p>
          )}
          {boostInfo && boostInfo.total > 0 && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="font-bold text-green-300">Bonus de récolte : +{boostInfo.total}%</p>
              <p className="text-sm text-gray-400">Grâce à : {boostInfo.sources.join(', ')}</p>
            </div>
          )}
          {adjacentZones && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Zones adjacentes potentiellement découvertes :</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {adjacentZones.map(zone => {
                  const Icon = (LucideIcons as any)[zone.icon || 'MapPin'];
                  return (
                    <div key={zone.id} className={cn("p-2 rounded-md flex flex-col items-center", zone.is_discovered ? "bg-green-500/20 border border-green-500/30" : "bg-blue-500/20 border-blue-500/30")}>
                      <Icon className="w-6 h-6 mb-1" />
                      <span className="text-xs text-center">{zone.type}</span>
                      {zone.is_discovered && <span className="text-xs text-green-300">(Déjà découvert)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InfoDisplayModal;