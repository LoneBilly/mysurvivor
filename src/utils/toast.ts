import { toast } from "sonner";

// Fonction utilitaire pour empêcher la propagation des clics
const createActionWithStopPropagation = (label: string, onClick?: () => void) => {
  return {
    label,
    onClick: (e: React.MouseEvent) => {
      // Arrête la propagation de l'événement
      e.stopPropagation();
      // Exécute le callback d'origine si fourni
      if (onClick) onClick();
    },
  };
};

export const showSuccess = (message: string) => {
  const toastId =  toast.success(message, {
    action: createActionWithStopPropagation("Fermer", () => toast.dismiss(toastId)),
    onDismiss: (e) => {
      // Empêche la propagation lors de la fermeture du toast
      if (e) e.stopPropagation();
    },
  });
  return toastId;
};

export const showError = (message: string) => {
  const toastId = toast.error(message, {
    action: createActionWithStopPropagation("Fermer", () => toast.dismiss(toastId)),
    onDismiss: (e) => {
      if (e) e.stopPropagation();
    },
  });
  return toastId;
};

export const showLoading = (message: string) => {
  const toastId = toast.loading(message, {
    action: createActionWithStopPropagation("Fermer", () => toast.dismiss(toastId)),
    onDismiss: (e) => {
      if (e) e.stopPropagation();
    },
  });
  return toastId;
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const showInfo = (message: string) => {
  const toastId = toast.info(message, {
    action: createActionWithStopPropagation("Fermer", () => toast.dismiss(toastId)),
    onDismiss: (e) => {
      if (e) e.stopPropagation();
    },
  });
  return toastId;
};