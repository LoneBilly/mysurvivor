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
import { getItemIconUrl } from '@/utils/imageUrls';
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
  const [useActionText, setUseActionText] = useState('Utiliser');
  const [loading, setLoading] = useState(false);
  
  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const debouncedName = useDebounce(name, 500);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isValidatingIcon, setIsValidatingIcon] = useState(false);
  const [iconExists, setIconExists] = useState<boolean | null>(null);
  const debouncedIcon = useDebounce(icon, 500);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [fetchingIcons, setFetchingIcons] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialName = item?.name || '';
      const initialIcon = item?.icon || '';
      
      setName(initialName);
      setDescription(item?.description || '');
      setIcon(initialIcon);
      setStackable(item?.stackable ?? true);
      setType(item?.type || 'Items divers');
      setUseActionText(item?.use_action_text || 'Utiliser');
      setNameExists(false);
      setPreviewUrl(null);
      setIconExists(null);
      setIsDeleteModalOpen(false);

      if (initialIcon) {
        setIsValidatingIcon(true);
        const url = getItemIconUrl(initialIcon);
        if (url) {
          setPreviewUrl(url);
          // We'll assume it exists if we have an initial icon, validation happens on new input
          setIconExists(true); 
        } else {
          setIconExists(false);
        }
        setIsValidatingIcon(false);
      }
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAvailableIcons = async () => {
      setFetchingIcons(true);
      try {
        const [storageRes, itemsRes] = await Promise.all([
          supabase.storage.from('items.icons').list(),
          supabase.from('items').select('icon')
        ]);

        if (storageRes.error) throw storageRes.error;
        if (itemsRes.error) throw itemsRes.error;

        const allStorageIcons = storageRes.data.map(file => file.name);
        const usedIcons = new Set(itemsRes.data.map(i => i.icon).filter(Boolean) as string[]);

        if (item?.icon) {
          usedIcons.delete(item.icon);
        }

        const unusedIcons = allStorageIcons.filter(iconName => !usedIcons.has(iconName));
        setAvailableIcons(unusedIcons.sort());

      } catch (error) {
        console.error("Error fetching available icons:", error);
        showError("Impossible de charger les icônes disponibles.");
      } finally {
        setFetchingIcons(false);
      }
    };

    fetchAvailableIcons();
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

    const validateIcon = () => {
      if (!debouncedIcon) {
        setPreviewUrl(null);
        setIconExists(null);
        return;
      }
      setIsValidatingIcon(true);
      const url = getItemIconUrl(debouncedIcon);
      setPreviewUrl(url);
      // The existence is checked via the img's onError handler
      setIsValidatingIcon(false);
    };

    checkName();
    validateIcon();
  }, [debouncedName, debouncedIcon, item, isOpen]);

  const handleActionTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setUseActionText(value);
  };

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
    const itemData = { 
      name, 
      description, 
      icon: icon || null, 
      stackable, 
      type,
      use_action_text: useActionText || 'Utiliser'
    };
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
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6"
        >
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
              <Label htmlFor="use_action_text" className="text-gray-300 font-mono">Texte d'action</Label>
              <Input id="use_action_text" value={useActionText} onChange={handleActionTextChange} className="mt-1 bg-white/5 border border-white/20 rounded-lg" required disabled={loading} />
            </div>
            <div>
              <Label htmlFor="type" className="text-gray-300 font-mono">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading}
                className="w-full mt-1 bg-white/5 border border-white/20 rounded-lg px-3 h-10 text-white focus:ring-white/30 focus:border-white/30"
              >
                <option value="Ressources">Ressources</option>
                <option value="Armes">Armes</option>
                <option value="Nourriture">Nourriture</option>
                <option value="Soins">Soins</option>
                <option value="Items divers">Items divers</option>
                <option value="Items craftés">Items craftés</option>
              </select>
            </div>
            <div>
              <Label htmlFor="icon" className="text-gray-300 font-mono">Icône (nom de fichier)</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  {isValidatingIcon ? <Loader2 className="w-5 h-5 animate-spin" /> :
                  previewUrl ? <img src={previewUrl} alt="Prévisualisation" className="w-full h-full object-contain p-1" onError={() => setIconExists(false)} onLoad={() => setIconExists(true)} /> :
                  <AlertCircle className="w-5 h-5 text-gray-500" />}
                </div>
                <div className="relative w-full">
                  <select
                    id="icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    disabled={loading || fetchingIcons}
                    className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg text-white focus:ring-white/30 focus:border-white/30"
                  >
                    <option value="">{fetchingIcons ? "Chargement..." : "Aucune icône"}</option>
                    {item?.icon && !availableIcons.includes(item.icon) && (
                      <option value={item.icon}>{item.icon} (actuelle)</option>
                    )}
                    {availableIcons.map((iconName) => (
                      <option key={iconName} value={iconName}>
                        {iconName}
                      </option>
                    ))}
                  </select>
                  {!isValidatingIcon && icon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 transform-gpu">
                      {iconExists ? <CheckCircle className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                    </div>
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
          { label: "Confirmer", onClick: handleDelete, variant: "destructive" },
          { label: "Annuler", onClick: () => setIsDeleteModalOpen(false), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default ItemFormModal;