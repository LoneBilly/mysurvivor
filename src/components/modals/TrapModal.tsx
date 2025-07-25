import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface TrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: any;
  onArmTrap: (constructionId: number) => Promise<void>;
  onClaimTrapLoot: (constructionId: number) => Promise<void>;
}

const TrapModal: React.FC<TrapModalProps> = ({ isOpen, onClose, construction, onArmTrap, onClaimTrapLoot }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  if (!construction) return null;

  const status = construction.building_state?.status;
  const hasLoot = construction.output_item_id !== null;

  const handleArm = async () => {
    setIsLoading(true);
    try {
      await onArmTrap(construction.id);
      toast({ title: "Piège armé", description: "Le piège est maintenant actif." });
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimLoot = async () => {
    setIsLoading(true);
    try {
      await onClaimTrapLoot(construction.id);
      toast({ title: "Butin récupéré", description: "Vous avez récupéré le butin du piège." });
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
          <DialogTitle>Piège</DialogTitle>
        </DialogHeader>
        <div>
          {status === 'armed' && <p>Le piège est armé et en attente.</p>}
          {status === 'disarmed' && <p>Le piège est désarmé.</p>}
          {status === 'triggered_animal' && <p>Le piège a attrapé quelque chose !</p>}
          {!status && <p>Le piège est prêt à être armé.</p>}
          {hasLoot && <p className="font-bold mt-2">Vous avez du butin à récupérer !</p>}
        </div>
        <DialogFooter>
          {hasLoot ? (
            <Button onClick={handleClaimLoot} disabled={isLoading}>
              {isLoading ? 'Récupération...' : 'Récupérer le butin'}
            </Button>
          ) : (
            <Button onClick={handleArm} disabled={isLoading || status === 'armed'}>
              {isLoading ? 'Armement...' : 'Armer le piège'}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrapModal;