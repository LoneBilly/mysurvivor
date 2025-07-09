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
      <DialogContent className="sm:max-w-md bg-black/60 backdrop-blur-sm border border-amber-400/20 rounded-lg shadow-2xl shadow-black/50 text-white p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-amber-400 font-mono tracking-wider uppercase text-xl">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-gray-300 mt-2 text-base">
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
                  className="flex-1 font-bold tracking-wide"
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