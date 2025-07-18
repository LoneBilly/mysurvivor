"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MoreMenuModal: React.FC<MoreMenuModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Menus Annexes</DialogTitle>
          <DialogDescription className="text-gray-400">
            Explorez des informations supplémentaires et des outils.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button variant="secondary" className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white">
            Patchnotes
          </Button>
          <Button variant="secondary" className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white">
            Guide du Joueur
          </Button>
          <Button variant="secondary" className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white">
            Support
          </Button>
          <Button variant="secondary" className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white">
            Règles du Jeu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MoreMenuModal;