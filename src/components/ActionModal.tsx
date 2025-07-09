import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <DialogContent className="sm:max-w-md bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000] rounded-none p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-black font-mono tracking-wider uppercase text-xl">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-gray-700 mt-2 text-base">
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
                  className={cn(
                    "flex-1 font-bold tracking-wide rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all",
                    action.variant === 'destructive' 
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : action.variant === 'secondary' || action.variant === 'outline'
                      ? "bg-white text-black hover:bg-gray-200"
                      : "bg-black text-white hover:bg-gray-800"
                  )}
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