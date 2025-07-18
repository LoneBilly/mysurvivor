"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal } from 'lucide-react';

interface MoreMenuProps {
  // You can add props here if needed, e.g., for custom menu items
}

const MoreMenu: React.FC<MoreMenuProps> = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all p-2"
          aria-label="Plus de menus"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Menus supplémentaires</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button variant="ghost" className="justify-start text-white hover:bg-gray-700">
            Patchnotes
          </Button>
          <Button variant="ghost" className="justify-start text-white hover:bg-gray-700">
            Guide
          </Button>
          <Button variant="ghost" className="justify-start text-white hover:bg-gray-700">
            Support
          </Button>
          {/* Add more menu items here as needed */}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MoreMenu;