import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showError } from '@/utils/toast';
import { Loader2, Zap, Clock, Box, BrickWall, TowerControl, AlertTriangle, Hammer, CookingPot, Trash2, TreeDeciduous, Cog } from 'lucide-react';

const buildings = [
  { name: 'Coffre basique', type: 'chest', icon: Box, costs: { energy: 20, wood: 20, metal: 0, components: 0 } },
  { name: 'Mur', type: 'wall', icon: BrickWall, costs: { energy: 10, wood: 0, metal: 20, components: 0 } },
  { name: 'Tourelle', type: 'turret', icon: TowerControl, costs: { energy: 50, wood: 0, metal: 10, components: 20 } },
  { name: 'Groupe électrogène', type: 'generator', icon: Zap, costs: { energy: 50, wood: 0, metal: 10, components: 20 } },
  { name: 'Piège à loup', type: 'trap', icon: AlertTriangle, costs: { energy: 30, wood: 0, metal: 1, components: 0 } },
  { name: 'Établi', type: 'workbench', icon: Hammer, costs: { energy: 30, wood: 5, metal: 0, components: 0 } },
  { name: 'Four', type: 'furnace', icon: CookingPot, costs: { energy: 30, wood: 0, metal: 20, components: 0 } },
];

type Building = typeof buildings[0];

interface FoundationMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number | null;
  y: number | null;
  onBuild: (x: number, y: number, building: Building) => void;
  onDemolish: (x: number, y: number) => void;
}

const CostItem = ({ icon: Icon, value }: { icon: React.ElementType, value: number }) => {
  if (value === 0) return null;
  return (
    <span className="flex items-center gap-1">
      <Icon size={12} /> {value}
    </span>
  );
};

const FoundationMenuModal = ({ isOpen, onClose, x, y, onBuild, onDemolish }: FoundationMenuModalProps) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
    }
  }, [isOpen]);

  const handleBuildClick = (building: Building) => {
    if (x === null || y === null) {
      showError("Erreur de coordonnées.");
      return;
    }
    setLoading(true);
    onClose();
    onBuild(x, y, building);
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
                      <CostItem icon={Zap} value={b.costs.energy} />
                      <CostItem icon={TreeDeciduous} value={b.costs.wood} />
                      <CostItem icon={Hammer} value={b.costs.metal} />
                      <CostItem icon={Cog} value={b.costs.components} />
                      <span className="flex items-center gap-1"><Clock size={12} /> 1m</span>
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleBuildClick(b)} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Construire'}
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDemolishClick} className="w-full flex items-center gap-2">
            <Trash2 className="w-4 h-4 mr-2" /> Démolir la fondation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FoundationMenuModal;