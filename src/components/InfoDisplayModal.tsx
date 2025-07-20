import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ItemIcon from "./ItemIcon";
import { useGame } from "@/contexts/GameContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string | null;
  icon: string | null;
  bonus?: {
    total: number;
    sources: { name: string; icon: string | null }[];
  };
}

const InfoDisplayModal = ({ isOpen, onClose, title, description, icon, bonus }: InfoDisplayModalProps) => {
  const { getIconUrl } = useGame();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-700/50 border-slate-600 flex-shrink-0 relative p-1">
              <ItemIcon iconName={getIconUrl(icon) || icon} alt={title} />
            </div>
            <div>
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
                {title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Détails pour {title}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {description && (
            <p className="text-gray-300">{description}</p>
          )}
        </div>
        {bonus && bonus.total > 0 && (
          <div className="mt-2 pt-4 border-t border-slate-600">
            <h4 className="font-semibold text-lg text-green-400 mb-2">Bonus de Récolte</h4>
            <p className="text-2xl font-bold text-white mb-3">+{bonus.total}%</p>
            <p className="text-sm text-gray-400 mb-2">Grâce à :</p>
            <div className="flex flex-wrap gap-2">
              {bonus.sources.map((source, index) => (
                <TooltipProvider key={index} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600">
                        <ItemIcon iconName={getIconUrl(source.icon) || source.icon} alt={source.name} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20">
                      <p>{source.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InfoDisplayModal;