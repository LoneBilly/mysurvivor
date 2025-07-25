import { toast } from "sonner";
import { X } from "lucide-react";
import React from "react";

export const showSuccess = (message: string) => {
  const toastId = toast.success(message, {
    action: {
      label: <X className="h-4 w-4" />,
      onClick: (e) => {
        e.stopPropagation();
        toast.dismiss(toastId);
      },
    },
  });
};

export const showError = (message: string) => {
  const toastId = toast.error(message, {
    action: {
      label: <X className="h-4 w-4" />,
      onClick: (e) => {
        e.stopPropagation();
        toast.dismiss(toastId);
      },
    },
  });
};

export const showLoading = (message: string) => {
  const toastId = toast.loading(message, {
    action: {
      label: <X className="h-4 w-4" />,
      onClick: (e) => {
        e.stopPropagation();
        toast.dismiss(toastId);
      },
    },
  });
  return toastId;
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const showInfo = (message: string) => {
  const toastId = toast.info(message, {
    action: {
      label: <X className="h-4 w-4" />,
      onClick: (e) => {
        e.stopPropagation();
        toast.dismiss(toastId);
      },
    },
  });
};