import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction } from "@/types/game";
import { Box, Trash2 } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: () => void;
}

const ChestModal = ({ isOpen, onClose, construction, onUpdate }: ChestModalProps) => {
  if (!construction) return null;

  const handleDemolish = async () => {
    const { error } = await supabase.rpc('demolish_building_to_foundation', {
      p_x: construction.x,
      p_y: construction.y,
    });

    if (error) {
      showError(error.message || "Erreur lors de la démolition.");
    } else {
      showSuccess("Bâtiment démoli. Il reste une fondation.");
      onUpdate();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Box className="w-7 h-7 text-white" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Coffre</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
            Stockez vos objets en sécurité.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 min-h-0">
          <div className="flex flex-col">
            <h3 className="text-center font-bold mb-2">Contenu du coffre (10 slots)</h3>
            <div className="flex-grow bg-black/20 rounded-lg p-2 border border-slate-700 flex items-center justify-center">
              <p className="text-center text-gray-400 p-4">Le stockage du coffre sera bientôt disponible.</p>
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-center font-bold mb-2">Votre inventaire</h3>
            <div className="flex-grow bg-black/20 rounded-lg p-2 border border-slate-700 flex items-center justify-center">
              <p className="text-center text-gray-400 p-4">L'affichage de l'inventaire sera bientôt disponible.</p>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={handleDemolish}>
            <Trash2 className="w-4 h-4 mr-2" />
            Détruire le coffre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChestModal;