import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showInfo } from '@/utils/toast';
import { BookText, Compass, LifeBuoy } from 'lucide-react';
import { useState } from "react";
import PatchNotesModal from "./PatchNotesModal";

interface MoreOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MoreOptionsModal = ({ isOpen, onClose }: MoreOptionsModalProps) => {
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);

  const handleOptionClick = (optionName: string) => {
    showInfo(`La section "${optionName}" sera bientôt disponible !`);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-sonner-toast]')) {
              e.preventDefault();
            }
          }}
          className="sm:max-w-sm bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6"
        >
          <DialogHeader className="text-center">
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Plus d'options</DialogTitle>
            <DialogDescription className="text-gray-300 mt-1">
              Accédez à des informations et des outils supplémentaires.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Button onClick={() => setIsPatchNotesOpen(true)} className="w-full flex items-center justify-start gap-3">
              <BookText className="w-5 h-5" /> Patchnotes
            </Button>
            <Button onClick={() => handleOptionClick("Guide")} className="w-full flex items-center justify-start gap-3">
              <Compass className="w-5 h-5" /> Guide du Survivant
            </Button>
            <Button onClick={() => handleOptionClick("Support")} className="w-full flex items-center justify-start gap-3">
              <LifeBuoy className="w-5 h-5" /> Support
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <PatchNotesModal isOpen={isPatchNotesOpen} onClose={() => setIsPatchNotesOpen(false)} />
    </>
  );
};

export default MoreOptionsModal;