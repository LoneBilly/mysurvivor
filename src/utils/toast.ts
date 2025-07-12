import { toast } from "sonner";

export const showSuccess = (message: string) => {
  const toastId = toast.success(message, {
    // L'action 'X' est redondante car le Toaster global gère déjà un bouton de fermeture avec l'icône Lucide.
    // action: {
    //   label: "X",
    //   onClick: (e) => {
    //     e.stopPropagation();
    //     toast.dismiss(toastId);
    //   },
    // },
  });
};

export const showError = (message: string) => {
  const toastId = toast.error(message, {
    // L'action 'X' est redondante car le Toaster global gère déjà un bouton de fermeture avec l'icône Lucide.
    // action: {
    //   label: "X",
    //   onClick: (e) => {
    //     e.stopPropagation();
    //     toast.dismiss(toastId);
    //   },
    // },
  });
};

export const showLoading = (message: string) => {
  const toastId = toast.loading(message, {
    // L'action 'X' est redondante car le Toaster global gère déjà un bouton de fermeture avec l'icône Lucide.
    // action: {
    //   label: "X",
    //   onClick: (e) => {
    //     e.stopPropagation();
    //     toast.dismiss(toastId);
    //   },
    // },
  });
  return toastId;
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const showInfo = (message: string) => {
  const toastId = toast.info(message, {
    // L'action 'X' est redondante car le Toaster global gère déjà un bouton de fermeture avec l'icône Lucide.
    // action: {
    //   label: "X",
    //   onClick: (e) => {
    //     e.stopPropagation();
    //     toast.dismiss(toastId);
    //   },
    // },
  });
};