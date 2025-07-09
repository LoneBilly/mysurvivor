import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  actions: {
    label: string;
    onClick: () => void;
    variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null;
  }[];
}

const ActionModal = ({ isOpen, onClose, title, description, actions }: ActionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="relative sm:max-w-md bg-slate-900/80 backdrop-blur-md border border-cyan-400/30 rounded-lg shadow-lg shadow-cyan-500/20 text-white p-6 overflow-hidden">
        {/* Decorative corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-lg"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-lg"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/50 rounded-bl-lg"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/50 rounded-br-lg"></div>

        <DialogHeader className="text-center">
          <DialogTitle className="text-cyan-300 font-mono tracking-wider uppercase text-xl">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-slate-300 mt-2 text-base">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {actions.length > 0 && (
          <DialogFooter className="mt-6 sm:justify-center">
            <div className="flex w-full flex-col sm:flex-row gap-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant || "default"}
                  className={`flex-1 font-bold tracking-wide ${
                    action.variant === 'default' || !action.variant
                      ? 'bg-cyan-600/80 hover:bg-cyan-600 text-white border border-cyan-500/50'
                      : ''
                  }`}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ActionModal;