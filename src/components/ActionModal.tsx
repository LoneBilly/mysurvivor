"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onConfirm: (value?: string) => void;
  confirmText: string;
  cancelText: string;
  showInput?: boolean;
  inputType?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  initialInputValue?: string;
  onExplore?: () => void;
  onInstallCamp?: () => void;
}

export function ActionModal({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  confirmText,
  cancelText,
  showInput = false,
  inputType = "text",
  inputLabel,
  inputPlaceholder,
  initialInputValue = "",
  onExplore,
  onInstallCamp,
}: ActionModalProps) {
  const [inputValue, setInputValue] = useState(initialInputValue);

  const handleConfirm = () => {
    onConfirm(showInput ? inputValue : undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-gray-300">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {showInput && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              {inputLabel && (
                <Label htmlFor="input-field" className="text-right text-gray-300">
                  {inputLabel}
                </Label>
              )}
              <Input
                id="input-field"
                type={inputType}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputPlaceholder}
                className="col-span-3 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-col gap-2 pt-4">
          {onInstallCamp && (
            <Button
              type="button"
              onClick={onInstallCamp}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Installer mon campement
            </Button>
          )}
          {onExplore && (
            <Button
              type="button"
              onClick={onExplore}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Explorer
            </Button>
          )}
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {confirmText}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white"
          >
            {cancelText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}