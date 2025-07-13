import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showError } from '@/utils/toast';
import { Loader2, Zap, Clock, Box, BrickWall, TowerControl, AlertTriangle, Hammer, CookingPot, Trash2 } from 'lucide-react';

const buildings = [
  { name: 'Coffre basique', type: 'chest', energy: 20, icon: Box },
  { name: 'Mur', type: 'wall', energy: 10, icon: BrickWall },
  { name: 'Tourelle', type: 'turret', energy: 50, icon: TowerControl },
  { name: 'Groupe électrogène', type: 'generator', energy: 50, icon: Zap },
  { name: 'Piège à loup', type: 'trap', energy: 30, icon: AlertTriangle },
  { name: 'Établi', type: 'workbench', energy: 30, icon: Hammer },
  { name: 'Four', type: 'furnace', energy: 30, icon: CookingPot },
];

interface FoundationMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number | null;
  y: number | null;
  onBuild: (x: number, y: number, buildingType: string) => void;
  onDemolish: (x: number, y: number) => void;
}

const FoundationMenuModal = ({ isOpen, onClose, x, y, onBuild, onDemolish }: FoundationMenuModalProps) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
    }
  }, [isOpen]);

  const handleBuildClick = (buildingType: string) => {
    if (x === null || y === null) {
      showError("Erreur de coordonnées.");
      return;
    }
    setLoading(true);
    onClose();
    onBuild(x, y, buildingType);
  };

  const handleDemolishClick = () => {
    if (x === null || y === null) {
      showError("Erreur de coordonnées.");
      return;
    }
    setLoading(true);
    onClose();
    onDemolish(x, y);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Construire sur la fondation</DialogTitle>
          <DialogDescription>Choisissez un bâtiment à construire. Chaque construction prend 1 minute.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2">
          {buildings.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.type} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-gray-300" />
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Zap size={12} /> {b.energy}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> 1m</span>
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleBuildClick(b.type)} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Construire'}
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDemolishClick} className="w-full flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Démolir la fondation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FoundationMenuModal;