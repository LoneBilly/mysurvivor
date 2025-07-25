import { supabase } from '../../integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { BaseConstruction, InventoryItem } from '@/types';
import { Crosshair } from 'lucide-react';

interface ArbaleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction;
  inventory: InventoryItem[];
}

export function ArbaleteModal({ isOpen, onClose, construction, inventory }: ArbaleteModalProps) {
  const queryClient = useQueryClient();

  const arrowItem = inventory.find(item => item.items.name === 'Flèche');
  const arrowQuantity = construction.building_state?.arrow_quantity || 0;
  const isArmed = construction.building_state?.is_armed || false;

  const armMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arbalète armée !");
      queryClient.invalidateQueries({ queryKey: ['playerData'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const loadMutation = useMutation({
    mutationFn: async (quantity: number) => {
      if (!arrowItem) throw new Error("Pas de flèches dans l'inventaire.");
      const { error } = await supabase.rpc('load_crossbow', {
        p_construction_id: construction.id,
        p_inventory_id: arrowItem.id,
        p_quantity: quantity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arbalète rechargée !");
      queryClient.invalidateQueries({ queryKey: ['playerData'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crosshair /> Arbalète
          </DialogTitle>
          <DialogDescription>
            Gérez votre arbalète défensive.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 my-4">
          <p>Flèches chargées : {arrowQuantity}</p>
          <p>Statut : {isArmed ? <span className="text-green-500 font-semibold">Armée</span> : <span className="text-red-500 font-semibold">Désarmée</span>}</p>
        </div>
        <DialogFooter className="gap-2 sm:justify-start flex-wrap">
          {!isArmed && arrowQuantity > 0 && (
            <Button onClick={() => armMutation.mutate()} disabled={armMutation.isPending}>
              {armMutation.isPending ? "Armement..." : "Armer"}
            </Button>
          )}
          {arrowItem && (
            <Button onClick={() => loadMutation.mutate(arrowItem.quantity)} disabled={loadMutation.isPending}>
              {loadMutation.isPending ? "Chargement..." : `Charger ${arrowItem.quantity} flèche(s)`}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}