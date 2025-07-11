import { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { getCachedSignedUrl } from '@/utils/iconCache';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import ActionModal from '../ActionModal';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
  onSave: () => void;
}

const ItemFormModal = ({ isOpen, onClose, item, onSave }: ItemFormModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [stackable, setStackable] = useState(true);
  const [type, setType] = useState('Items divers');
  const [loading, setLoading] = useState(false);
  
  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const debouncedName = useDebounce(name, 500);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isValidatingIcon, setIsValidatingIcon] = useState(false);
  const [iconExists, setIconExists] = useState<boolean | null>(null);
  const debouncedIcon = useDebounce(icon, 500);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialName = item?.name || '';
      const initialIcon = item?.icon || '';
      
      setName(initialName);
      setDescription(item?.description || '');
      setIcon(initialIcon);
      setStackable(item?.stackable ?? true);
      setType(item?.type || 'Items divers');
      setNameExists(false);
      setPreviewUrl(null);
      setIconExists(null);
      setIsDeleteModalOpen(false);

      if (initialIcon) {
        setIsValidatingIcon(true);
        getCachedSignedUrl(initialIcon).then(url => {
          if (url) {
            setPreviewUrl(url);
            setIconExists(true);
          } else {
            setIconExists(false);
          }
          setIsValidatingIcon(false);
        });
      }
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;

    const checkName = async () => {
      if (debouncedName.trim() === '' || (item && debouncedName === item.name)) {
        setNameExists(false);
        return;
      }
      setCheckingName(true);
      const { data } = await supabase.from('items').select('id').ilike('name', debouncedName);
      setNameExists(data && data.length > 0);
      setCheckingName(false);
    };

    const validateIcon = async () => {
      if (debouncedIcon === (item?.icon || '')) return;
      if (!debouncedIcon) {
        setPreviewUrl(null);
        setIconExists(null);
        return;
      }
      setIsValidatingIcon(true);
      const url = await getCachedSignedUrl(debouncedIcon);
      if (url) {
        setPreviewUrl(url);
        setIconExists(true);
      } else {
        setPreviewUrl(null);
        setIconExists(false);
      }
      setIsValidatingIcon(false);
    };

    checkName();
    validateIcon();
  }, [debouncedName, debouncedIcon, item, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (nameExists) {
      showError("Un objet avec ce nom existe déjà.");
      return;
    }
    if (icon && !iconExists) {
      showError("L'icône spécifiée n'existe pas dans le stockage.");
      return;
    }

    setLoading(true);
    const itemData = { name, description, icon: icon || null, stackable, type };
    const { error } = item
      ? await supabase.from('items').update(itemData).eq('id', item.id)
      : await supabase.from('items').insert(itemData);

    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess(`Objet ${item ? 'mis à jour' : 'créé'} !`);
      onSave();
      onClose();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!item) return;
    setLoading(true);
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    if (error) {
      showError(`Erreur lors de la suppression: ${error.message}`);
    } else {
      showSuccess("Objet supprimé avec succès.");
      onSave();
      setIsDeleteModalOpen(false);
      onClose();
    }
    setLoading(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
              {item ? 'Modifier l\'objet' : 'Créer un objet'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="name" className="text-gray-300 font-mono">Nom</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 bg-white/5 border border-white/20 rounded-lg" required disabled={loading} />
              {checkingName && <Loader2 className="w-4 h-4 animate-spin text-white mt-1" />}
              {nameExists && !checkingName && <p className="text-red-400 text-sm mt-1">Ce nom existe déjà !</p>}
            </div>
            <div>
              <Label htmlFor="description" className="text-gray-300 font-mono">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 bg-white/5 border border-white/20 rounded-lg" disabled={loading} />
            </div>
            <div>
              <Label htmlFor="type" className="text-gray-300 font-mono">Type</Label>
              <Select value={type} onValueChange={setType} disabled={loading}>
                <SelectTrigger id="type" className="mt-1 bg-white/5 border border-white/20 rounded-lg">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ressources">Ressources</SelectItem>
                  <SelectItem value="Armes">Armes</SelectItem>
                  <SelectItem value="Nourriture">Nourriture</SelectItem>
                  <SelectItem value="Soins">Soins</SelectItem>
                  <SelectItem value="Items divers">Items divers</SelectItem>
                  <SelectItem value="Items craftés">Items craftés</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="icon" className="text-gray-300 font-mono">Icône (nom de fichier)</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  {isValidatingIcon ? <Loader2 className="w-5 h-5 animate-spin" /> :
                  previewUrl ? <img src={previewUrl} alt="Prévisualisation" className="w-full h-full object-contain p-1" /> :
                  <AlertCircle className="w-5 h-5 text-gray-500" />}
                </div>
                <div className="relative w-full">
                  <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value.toLowerCase())} className="bg-white/5 border border-white/20 rounded-lg" placeholder="ex: pomme.png" disabled={loading} />
                  {!isValidatingIcon && icon && (
                    iconExists ? <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" /> : <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="stackable" checked={stackable} onCheckedChange={(checked) => setStackable(!!checked)} className="border-white/20 data-[state=checked]:bg-white/20 data-[state=checked]:text-white rounded" disabled={loading} />
              <Label htmlFor="stackable" className="text-gray-300 font-mono">Empilable</Label>
            </div>
            <DialogFooter className="pt-4">
              <div className="flex w-full items-center justify-between gap-2">
                <div>
                  {item && (
                    <Button type="button" variant="destructive" onClick={() => setIsDeleteModalOpen(true)} disabled={loading} className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </Button>
                  )}
                </div>
                <Button type="submit" disabled={loading || nameExists || !name.trim() || (icon.length > 0 && !iconExists)} className="rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {item ? 'Sauvegarder' : 'Créer l\'objet'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ActionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer l'objet "${item?.name}" ? Cette action est irréversible.`}
        actions={[
          { label: "Confirmer", onClick: handleDelete, variant: "destructive", disabled: loading },
          { label: "Annuler", onClick: () => setIsDeleteModalOpen(false), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default ItemFormModal;