import { toast } from "sonner";
import { X } from "lucide-react";
import React from "react";

const CloseButton = ({ toastId }: { toastId: string | number }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      toast.dismiss(toastId);
    }}
    className="absolute right-2.5 top-2.5 rounded-md p-1 text-white/50 opacity-80 hover:opacity-100 hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50 transition-opacity"
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Fermer</span>
  </button>
);

const generateToastId = () => `toast-${Date.now()}-${Math.random()}`;

export const showSuccess = (message: string) => {
  const toastId = generateToastId();
  toast.success(message, {
    id: toastId,
    description: <CloseButton toastId={toastId} />,
  });
};

export const showError = (message: string) => {
  const toastId = generateToastId();
  toast.error(message, {
    id: toastId,
    description: <CloseButton toastId={toastId} />,
  });
};

export const showLoading = (message: string) => {
  const toastId = generateToastId();
  toast.loading(message, {
    id: toastId,
    description: <CloseButton toastId={toastId} />,
  });
  return toastId;
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const showInfo = (message: string) => {
  const toastId = generateToastId();
  toast.info(message, {
    id: toastId,
    description: <CloseButton toastId={toastId} />,
  });
};