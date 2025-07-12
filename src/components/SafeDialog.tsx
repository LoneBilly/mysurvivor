import * as React from "react";
import {
  Dialog as ShadDialog,
  DialogTrigger as ShadDialogTrigger,
  DialogPortal as ShadDialogPortal,
  DialogClose as ShadDialogClose,
  DialogOverlay as ShadDialogOverlay,
  DialogContent as ShadDialogContent,
  DialogHeader as ShadDialogHeader,
  DialogFooter as ShadDialogFooter,
  DialogTitle as ShadDialogTitle,
  DialogDescription as ShadDialogDescription,
} from "@/components/ui/dialog";
import type { ComponentPropsWithoutRef } from "react";

type DialogContentProps = ComponentPropsWithoutRef<typeof ShadDialogContent>;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof ShadDialogContent>,
  DialogContentProps
>((props, ref) => {
  const handlePointerDownOutside = (e: Event) => {
    const target = e.target as HTMLElement;
    // Vérifie si le clic provient d'un toast (de la librairie sonner)
    if (target.closest('[data-sonner-toast]')) {
      // Empêche la modale de se fermer
      e.preventDefault();
    }
    // Appelle la fonction originale si elle existe
    props.onPointerDownOutside?.(e);
  };

  return <ShadDialogContent {...props} onPointerDownOutside={handlePointerDownOutside} ref={ref} />;
});
DialogContent.displayName = "DialogContent";

// Ré-exporte tous les composants de la modale
export const Dialog = ShadDialog;
export const DialogTrigger = ShadDialogTrigger;
export const DialogPortal = ShadDialogPortal;
export const DialogClose = ShadDialogClose;
export const DialogOverlay = ShadDialogOverlay;
export const DialogHeader = ShadDialogHeader;
export const DialogFooter = ShadDialogFooter;
export const DialogTitle = ShadDialogTitle;
export const DialogDescription = ShadDialogDescription;
export { DialogContent };