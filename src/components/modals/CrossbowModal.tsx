import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CrossbowModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: any;
  inventory: any[];
  onArmCrossbow: (constructionId: number) => Promise<void>;
  onLoadCrossbow: (constructionId: number, inventoryId: number, quantity: number) => Promise<void>;
}

const CrossbowModal: React.FC<CrossbowModalProps> = ({ isOpen, onClose, construction, inventory, onArmCrossbow, onLoadCrossbow }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [quantityToLoad, setQuantityToLoad] = useState(1);

  if (!construction) return null;

  const arrowStack = inventory.find(item => item.items.name === 'Flèche');
  const arrowQuantity = construction.building_state?.arrow_quantity || 0;
  const isArmed = construction.building_state?.is_armed || false;

  const handleLoad = async () => {
    if (!arrowStack) {
      toast({ title: "Erreur", description: "Vous n'avez pas de flèches dans votre inventaire.", variant: "destructive" });
      return;
    }
    if (quantityToLoad > arrowStack.quantity) {
        toast({ title: "Erreur", description: "Vous n'avez pas assez de flèches.", variant: "destructive" });
        return;
    }
    if (quantityToLoad <= 0) {
        toast({ title: "Erreur", description: "La quantité doit être positive.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      await onLoadCrossbow(construction.id, arrowStack.id, quantityToLoad);
      toast({ title: "Arbalète chargée", description: `${quantityToLoad} flèche(s) chargée(s).` });
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArm = async () => {
    setIsLoading(true);
    try {
      await onArmCrossbow(construction.id);
      toast({ title: "Arbalète armée", description: "L'arbalète est prête à tirer." });
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arbalète</DialogTitle>
        </DialogHeader>
        <div>
          <p>Flèches dans l'arbalète: {arrowQuantity}</p>
          <p>Statut: {isArmed ? <span className="text-green-500">Armée</span> : <span className="text-red-500">Désarmée</span>}</p>
          
          {arrowStack && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="arrows">Charger des flèches (vous avez {arrowStack.quantity})</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="arrows"
                  type="number"
                  min="1"
                  max={arrowStack.quantity}
                  value={quantityToLoad}
                  onChange={(e) => setQuantityToLoad(parseInt(e.target.value, 10) || 1)}
                  className="w-24"
                />
                <Button onClick={handleLoad} disabled={isLoading}>
                  {isLoading ? 'Chargement...' : 'Charger'}
                </Button>
              </div>
            </div>
          )}
          {!arrowStack && <p className="mt-4 text-sm text-gray-500">Vous n'avez pas de flèches à charger.</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleArm} disabled={isLoading || isArmed || arrowQuantity === 0}>
            {isLoading ? 'Armement...' : 'Armer'}
          </Button>
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrossbowModal;