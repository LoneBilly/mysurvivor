import { toast } from "sonner";
import { ToastWithCloseButton } from "@/components/ToastWithCloseButton";
import { CheckCircle, XCircle, Info } from "lucide-react";

export const showSuccess = (message: string) => {
  toast.custom((t) => <ToastWithCloseButton toastId={t} message={message} />, {
    icon: <CheckCircle className="text-green-500" />,
  });
};

export const showError = (message: string) => {
  toast.custom((t) => <ToastWithCloseButton toastId={t} message={message} />, {
    icon: <XCircle className="text-red-500" />,
  });
};

export const showInfo = (message: string) => {
  toast.custom((t) => <ToastWithCloseButton toastId={t} message={message} />, {
    icon: <Info className="text-blue-500" />,
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};