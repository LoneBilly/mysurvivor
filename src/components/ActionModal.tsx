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
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-gray-400">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {actions.length > 0 && (
          <DialogFooter className="mt-4">
            <div className="flex flex-wrap justify-end gap-2">
              {actions.map((action, index) => (
                <Button key={index} onClick={action.onClick} variant={action.variant || "default"}>
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