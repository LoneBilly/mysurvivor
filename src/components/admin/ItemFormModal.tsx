import { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Item, CraftingRecipe } from '@/types/game';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, AlertCircle, CheckCircle, Trash2, Wrench } from 'lucide-react';
import { getPublicIconUrl } from '@/utils/imageUrls';
import ActionModal from '../ActionModal';
import RecipeEditorModal from './RecipeEditorModal';

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
  const [effects, setEffects] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  
  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const debouncedName = useDebounce(name, 500);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isValidatingIcon, setIsValidatingIcon] = useState(false);
  const [iconExists, setIconExists] = useState<boolean | null>(null);
  const debouncedIcon = useDebounce(icon, 500);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isCraftable, setIsCraftable] = useState(false);
  const [recipeId, setRecipeId] = useState<number | null>(null);
  const [draftRecipe, setDraftRecipe] = useState<Partial<CraftingRecipe> | null>(null);

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
      setUseActionText(item?.use_action_text || '');
      setEffects(item?.effects || {});
      setNameExists(false);
      setPreviewUrl(null);
      setIconExists(null);
      setIsDeleteModalOpen(false);
      
      if (item) {
        const fetchRecipe = async () => {
          const { data } = await supabase.from('crafting_recipes').select('id').eq('result_item_id', item.id).single();
          if (data) {
            setRecipeId(data.id);
            setIsCraftable(true);
            setDraftRecipe(null);
          } else {
            setRecipeId(null);
            setIsCraftable(false);
            setDraftRecipe(null);
          }
        };
        fetchRecipe();
      } else {
        setRecipeId(null);
        setIsCraftable(false);
        setDraftRecipe(null);
      }

      if (initialIcon) {
        setIsValidatingIcon(true);
        const url = getPublicIconUrl(initialIcon);
        if (url) {
          setPreviewUrl(url);
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

        const allStorageIcons = storageRes.data.map(file => file.name).filter(name => name !== '.emptyfolderplaceholder');
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
      const url = getPublicIconUrl(debouncedIcon);
      setPreviewUrl(url);
      setIconExists(!!url);
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

  const handleEffectChange = (key: string, value: string) => {
    const numValue = parseFloat(value);
    setEffects(prev => ({ ...prev, [key]: isNaN(numValue) ? undefined : numValue }));
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
    if (isCraftable && !draftRecipe && !item) {
      showError("Veuillez définir un blueprint pour cet objet craftable.");
      return;
    }

    setLoading(true);
    
    if (!item) {
      const { error } = await supabase.rpc('create_item_and_recipe', {
        p_name: name,
        p_description: description,
        p_icon: icon || null,
        p_stackable: stackable,
        p_type: type,
        p_use_action_text: useActionText || null,
        p_is_craftable: isCraftable,
        p_effects: effects,
        p_recipe_result_quantity: draftRecipe?.result_quantity || 1,
        p_recipe_slot1_item_id: draftRecipe?.slot1_item_id || null,
        p_recipe_slot1_quantity: draftRecipe?.slot1_quantity || null,
        p_recipe_slot2_item_id: draftRecipe?.slot2_item_id || null,
        p_recipe_slot2_quantity: draftRecipe?.slot2_quantity || null,
        p_recipe_slot3_item_id: draftRecipe?.slot3_item_id || null,
        p_recipe_slot3_quantity: draftRecipe?.slot3_quantity || null,
        p_recipe_craft_time_seconds: draftRecipe?.craft_time_seconds || 10,
      }).single();

      if (error) {
        showError(`Erreur: ${error.message}`);
        setLoading(false);
        return;
      }
      showSuccess(`Objet créé !`);

    } else {
      const itemDataToUpdate = {
        name,
        description,
        icon: icon || null,
        stackable,
        type,
        use_action_text: useActionText || null,
        effects,
        recipe_id: isCraftable ? recipeId : null,
      };

      const { error: updateItemError } = await supabase.from('items').update(itemDataToUpdate).eq('id', item.id);
      if (updateItemError) {
        showError(`Erreur lors de la mise à jour de l'objet: ${updateItemError.message}`);
        setLoading(false);
        return;
      }

      if (!isCraftable && item.recipe_id) {
        await supabase.from('items').update({ recipe_id: null }).eq('id', item.id);
        await supabase.from('crafting_recipes').delete().eq('result_item_id', item.id);
      }
      showSuccess(`Objet mis à jour !`);
    }

    onSave();
    onClose();
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

  const currentItemForRecipeEditor: Item = item || {
    id: -1,
    name: name || 'Nouvel Objet',
    description: description || '',
    icon: icon || null,
    stackable: stackable,
    type: type,
    use_action_text: useActionText || '',
    created_at: new Date().toISOString(),
  };

  const renderEffectFields = () => {
    switch (type) {
      case 'Sac à dos':
        return <div><Label>Slots supplémentaires</Label><Input type="number" value={effects.extra_slots || ''} onChange={(e) => handleEffectChange('extra_slots', e.target.value)} className="mt-1 bg-white/5 border-white/20" /></div>;
      case 'Armure':
        return <div><Label>Bonus de vie</Label><Input type="number" value={effects.hp_bonus || ''} onChange={(e) => handleEffectChange('hp_bonus', e.target.value)} className="mt-1 bg-white/5 border-white/20" /></div>;
      case 'Vehicule':
        return <div><Label>Multiplicateur coût énergie (ex: 0.8)</Label><Input type="number" step="0.01" value={effects.energy_multiplier || ''} onChange={(e) => handleEffectChange('energy_multiplier', e.target.value)} className="mt-1 bg-white/5 border-white/20" /></div>;
      case 'Chaussures':
        return <div><Label>Multiplicateur temps exploration (ex: 0.9)</Label><Input type="number" step="0.01" value={effects.exploration_multiplier || ''} onChange={(e) => handleEffectChange('exploration_multiplier', e.target.value)} className="mt-1 bg-white/5 border-white/20" /></div>;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader className="text-center">
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
              {item ? 'Modifier l\'objet' : 'Créer un objet'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulaire pour {item ? 'modifier les détails d\'un' : 'créer un nouvel'} objet.
            </DialogDescription>
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
              <Label htmlFor="use_action_text" className="text-gray-300 font-mono">Texte d'action (optionnel)</Label>
              <Input id="use_action_text" value={useActionText} onChange={handleActionTextChange} className="mt-1 bg-white/5 border border-white/20 rounded-lg" disabled={loading} />
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
                <option value="Armure">Armure</option>
                <option value="Sac à dos">Sac à dos</option>
                <option value="Chaussures">Chaussures</option>
                <option value="Vehicule">Vehicule</option>
                <option value="Nourriture">Nourriture</option>
                <option value="Soins">Soins</option>
                <option value="Outils">Outils</option>
                <option value="Équipements">Équipements</option>
                <option value="Items divers">Items divers</option>
                <option value="Items craftés">Items craftés</option>
              </select>
            </div>
            {renderEffectFields()}
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
                      <option value={item.icon}>{item.icon}</option>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="stackable" checked={stackable} onCheckedChange={(checked) => setStackable(!!checked)} className="border-white/20 data-[state=checked]:bg-white/20 data-[state=checked]:text-white rounded" disabled={loading} />
                <Label htmlFor="stackable" className="text-gray-300 font-mono">Empilable</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="craftable" checked={isCraftable} onCheckedChange={(checked) => setIsCraftable(!!checked)} className="border-white/20 data-[state=checked]:bg-white/20 data-[state=checked]:text-white rounded" disabled={loading} />
                <Label htmlFor="craftable" className="text-gray-300 font-mono">Craftable</Label>
              </div>
            </div>
            {isCraftable && (
              <Button type="button" variant="outline" onClick={() => setIsRecipeModalOpen(true)} disabled={loading} className="w-full flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                {item ? (recipeId ? 'Modifier le Blueprint' : 'Créer le Blueprint') : (draftRecipe ? 'Modifier le Blueprint' : 'Créer le Blueprint')}
              </Button>
            )}
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
                <Button type="submit" disabled={loading || nameExists || !name.trim() || (icon.length > 0 && !iconExists) || (isCraftable && !draftRecipe && !item)}>
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
      {isRecipeModalOpen && (
        <RecipeEditorModal
          isOpen={isRecipeModalOpen}
          onClose={() => setIsRecipeModalOpen(false)}
          resultItem={currentItemForRecipeEditor}
          recipeId={recipeId}
          onSave={(recipeData) => {
            setDraftRecipe(recipeData);
            setIsRecipeModalOpen(false);
            if (item && recipeData.id) {
              setRecipeId(recipeData.id as number);
            }
          }}
          isNewItem={!item}
          initialRecipeData={draftRecipe}
        />
      )}
    </>
  );
};

export default ItemFormModal;