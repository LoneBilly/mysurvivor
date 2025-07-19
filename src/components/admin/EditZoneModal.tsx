import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { MapCell } from '@/types/game';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EditZoneModalProps {
  zone: MapCell | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const EditZoneModal = ({ zone, isOpen, onClose, onSave }: EditZoneModalProps) => {
  const [formData, setFormData] = useState({
    type: '',
    icon: '',
    interaction_type: 'Non défini',
    id_name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isCreateMode = !zone?.type;
  const lucideIconNames = Object.keys(LucideIcons).filter(key => key.match(/^[A-Z]/));

  useEffect(() => {
    if (zone) {
      setFormData({
        type: zone.type || '',
        icon: zone.icon || '',
        interaction_type: zone.interaction_type || 'Non défini',
        id_name: (zone as any).id_name || ''
      });
    }
  }, [zone]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('map_layout')
      .update({
        type: formData.type,
        icon: formData.icon,
        interaction_type: formData.interaction_type,
        id_name: formData.id_name
      })
      .eq('id', zone.id);

    setIsLoading(false);
    if (error) {
      showError(`Erreur : ${error.message}`);
    } else {
      showSuccess(`Zone ${isCreateMode ? 'créée' : 'mise à jour'} avec succès.`);
      onSave();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!zone) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_zone_type', { p_zone_id: zone.id });
    setIsDeleting(false);
    if (error) {
      showError(`Erreur lors de la suppression : ${error.message}`);
    } else {
      showSuccess('Zone réinitialisée avec succès.');
      onSave();
      onClose();
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isCreateMode ? 'Créer une nouvelle zone' : `Modifier la zone : ${zone?.type}`}</DialogTitle>
          <DialogDescription>
            {isCreateMode ? `Configuration pour la case (${zone?.x}, ${zone?.y}).` : `Modification de la zone à la position (${zone?.x}, ${zone?.y}).`}
          </DialogDescription>
        </DialogHeader>
        <form id="zone-form" onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Input id="type" name="type" value={formData.type} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="id_name" className="text-right">ID Nom</Label>
            <Input id="id_name" name="id_name" value={formData.id_name} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="icon" className="text-right">Icône</Label>
            <Select name="icon" value={formData.icon} onValueChange={(value) => handleSelectChange('icon', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Choisir une icône" />
              </SelectTrigger>
              <SelectContent>
                {lucideIconNames.map(iconName => (
                  <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="interaction_type" className="text-right">Interaction</Label>
            <Select name="interaction_type" value={formData.interaction_type} onValueChange={(value) => handleSelectChange('interaction_type', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Type d'interaction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Non défini">Non défini</SelectItem>
                <SelectItem value="Ressource">Ressource</SelectItem>
                <SelectItem value="Action">Action</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter className="sm:justify-between">
          {!isCreateMode ? (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mr-auto">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette zone ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Elle réinitialisera la zone à son état vide, mais ne supprimera pas la case de la carte.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : <div />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" form="zone-form" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreateMode ? 'Créer' : 'Sauvegarder'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditZoneModal;