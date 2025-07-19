import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle } from "lucide-react";

// Définition des types pour les données de l'événement
interface Zone {
  id: number;
  x: number;
  y: number;
  type: string;
  icon: string;
  is_discovered: boolean;
}

interface InfoData {
  name: string;
  description: string;
  icon: string;
  discoverable_zones?: Zone[];
  loot?: any[];
  effects?: any;
}

interface InfoDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  info: InfoData | null;
}

export function InfoDisplayModal({ isOpen, onClose, info }: InfoDisplayModalProps) {
  if (!info) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-700/50 border-slate-600 flex-shrink-0 relative p-1">
              {info.icon && (
                <img src={`/icons/events/${info.icon}.webp`} alt={info.name} className="w-full h-full object-contain" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-yellow-400">{info.name}</DialogTitle>
              <DialogDescription className="text-slate-300 mt-1">
                {info.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {info.discoverable_zones && info.discoverable_zones.length > 0 && (
          <div className="my-4">
            <h3 className="font-semibold text-lg text-slate-200 mb-3 border-b border-slate-700 pb-2">Carte trouvée</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {info.discoverable_zones.map((zone) => (
                <div key={zone.id} className={`p-2 rounded-lg border ${zone.is_discovered ? 'bg-green-900/30 border-green-700/50' : 'bg-slate-700/50 border-slate-600'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-800 rounded-md flex items-center justify-center">
                      <img src={`/icons/zones/${zone.icon}`} alt={zone.type} className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-sm text-slate-100">{zone.type}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                    <span>({zone.x}, {zone.y})</span>
                    {zone.is_discovered ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle size={14} />
                        <span>Déjà connu</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <MapPin size={14} />
                        <span>Nouveau</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}