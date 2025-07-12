import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "./ui/button";

interface ToastWithCloseButtonProps {
  toastId: string | number;
  message: string;
}

export const ToastWithCloseButton = ({ toastId, message }: ToastWithCloseButtonProps) => {
  return (
    <div className="flex items-center justify-between w-full gap-4">
      <span>{message}</span>
      <Button
        variant="ghost"
        size="icon"
        className="p-1 h-auto w-auto flex-shrink-0 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => toast.dismiss(toastId)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};