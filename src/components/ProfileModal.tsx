import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { User } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <User className="w-6 h-6" />
            Profil du Survivant
          </DialogTitle>
          <DialogDescription>
            Changez votre nom de survivant.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="username" className="text-right">
              Nom
            </label>
            <Input id="username" defaultValue="Player1" className="col-span-3 bg-white/10 border-white/20" />
          </div>
        </div>
        <Button type="submit" className="w-full">Sauvegarder</Button>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;