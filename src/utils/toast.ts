import { toast } from "sonner";

export const showSuccess = (message: string) => {
  return toast.success(message);
};

export const showError = (message: string) => {
  return toast.error(message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const showInfo = (message: string) => {
  return toast.info(message);
};