import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ItemIcon from "./ItemIcon";
import { useGame } from "@/contexts/GameContext";

interface InfoDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string | null;
  icon: string | null;
}

const InfoDisplayModal = ({ isOpen, onClose, title, description, icon }: InfoDisplayModalProps) => {
  const { getIconUrl } = useGame();
  const iconUrl = getIconUrl(icon);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InfoDisplayModal;