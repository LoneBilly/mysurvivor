"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FullPlayerData, BaseConstruction } from '@/types/types';

interface LoadCrossbowModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerData: FullPlayerData | null;
  crossbow: BaseConstruction | null;
  refetchPlayerData: () => void;
}

export function LoadCrossbowModal({ isOpen, onClose, playerData, crossbow, refetchPlayerData }: LoadCrossbowModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const arrowItem = playerData?.inventory.find(item => item.items.name === 'Flèche');

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen]);

  const handleLoad = async () => {
    if (!arrowItem || !crossbow) return;

    if (quantity <= 0 || quantity > arrowItem.quantity) {
      toast({
        title: 'Quantité invalide',
        description: `Vous ne pouvez charger qu'entre 1 et ${arrowItem.quantity} flèches.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.rpc('load_crossbow', {
      p_construction_id: crossbow.id,
      p_inventory_id: arrowItem.id,
      p_quantity: quantity,
    });

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: `${quantity} flèche(s) chargée(s) dans l'arbalète.`,
      });
      refetchPlayerData();
      onClose();
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Charger l'arbalète</DialogTitle>
          <DialogDescription>
            Sélectionnez le nombre de flèches à charger depuis votre inventaire.
          </DialogDescription>
        </DialogHeader>
        <div>
          <p className="mb-2">Vous avez <span className="font-bold">{arrowItem?.quantity || 0}</span> flèche(s) dans votre inventaire.</p>
          {arrowItem && arrowItem.quantity > 0 ? (
            <div className="flex items-center space-x-2 my-4">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(arrowItem.quantity, parseInt(e.target.value, 10) || 1)))}
                min="1"
                max={arrowItem.quantity}
              />
              <Button variant="outline" onClick={() => setQuantity(arrowItem.quantity)}>Max</Button>
            </div>
          ) : (
            <p className="text-red-500 my-4">Vous n'avez pas de flèches.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
          <Button onClick={handleLoad} disabled={isLoading || !arrowItem || arrowItem.quantity === 0}>
            {isLoading ? 'Chargement...' : 'Charger'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}