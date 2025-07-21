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
import { Loader2, AlertCircle, CheckCircle, Trash2, Wrench, PlusCircle } from 'lucide-react';
import { getPublicIconUrl } from '@/utils/imageUrls';
import ActionModal from '../ActionModal';
import RecipeEditorModal from './RecipeEditorModal';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
  onSave: () => void;
  allItems: Item[];
}

const PREDEFINED_EFFECTS = [
  { key: 'ammo_item_id', label: 'Munition (Armes)', type: 'item_id' },
  { key: 'slots_supplementaires', label: 'Slots supplémentaires (Sac à dos)', type: 'number' },
  { key: 'reduction_cout_energie_deplacement_pourcentage', label: 'Réduction coût énergie déplacement %', type: 'number' },
  { key: 'reduction_temps_exploration_pourcentage', label: 'Réduction temps exploration %', type: 'number' },
  { key: 'bonus_recolte_bois_pourcentage', label: 'Bonus récolte bois %', type: 'number' },
  { key: 'bonus_recolte_pierre_pourcentage', label: 'Bonus récolte pierre %', type: 'number' },
  { key: 'bonus_recolte_viande_pourcentage', label: 'Bonus récolte viande %', type: 'number' },
  { key: 'restaure_vie', label: 'Restaure Vie (Consommable)', type: 'number' },
  { key: 'restaure_faim', label: 'Restaure Faim (Consommable)', type: 'number' },
  { key: 'restaure_soif', label: 'Restaure Soif (Consommable)', type: 'number' },
  { key: 'restaure_energie', label: 'Restaure Énergie (Consommable)', type: 'number' },
  { key: 'reduire_vie', label: 'Réduit Vie (Consommable)', type: 'number' },
  { key: 'reduire_faim', label: 'Réduit Faim (Consommable)', type: 'number' },
  { key: 'reduire_soif', label: 'Réduit Soif (Consommable)', type: 'number' },
  { key: 'reduire_energie', label: 'Réduit Énergie (Consommable)', type: 'number' },
];

const ItemFormModal = ({ isOpen, onClose, item, onSave, allItems }: ItemFormModalProps) => {
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
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isCraftable, setIsCraftable] = useState(false);
  const [recipeId, setRecipeId] = useState<number | null>(null);
  const [draftRecipe, setDraftRecipe] = useState<Partial<CraftingRecipe> | null>(null);
  
  const [effectsList, setEffectsList] = useState<{ id: number; key: string; value: any }[]>([]);

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
      
      const initialEffects = item?.effects || {};
      const effectsArray = Object.entries(initialEffects).map(([key, value], index) => ({
        id: index,
        key,
        value,
      }));
      setEffectsList(effectsArray);

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

  const handleAddEffect = () => {
    setEffectsList(prev => [...prev, { id: Date.now(), key: '', value: '' }]);
  };

  const handleEffectChange = (id: number, field: 'key' | 'value', newValue: any) => {
    setEffectsList(prev => prev.map(effect => {
      if (effect.id === id) {
        const newEffect = { ...effect, [field]: newValue };
        // Reset value if key changes to a different type
        if (field === 'key') {
          const newEffectConfig = PREDEFINED_EFFECTS.find(e => e.key === newValue);
          if (newEffectConfig?.type === 'item_id') {
            newEffect.value = '';
          } else {
            newEffect.value = 0;
          }
        }
        return newEffect;
      }
      return effect;
    }));
  };

  const handleRemoveEffect = (id: number) => {
    setEffectsList(prev => prev.filter(effect => effect.id !== id));
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
    
    const finalEffects = effectsList.reduce((acc, effect) => {
      if (effect.key.trim() !== '') {
        const effectConfig = PREDEFINED_EFFECTS.find(e => e.key === effect.key);
        const isNumeric = effectConfig ? effectConfig.type === 'number' || effectConfig.type === 'item_id' : !isNaN(Number(effect.value));
        const value = isNumeric ? Number(effect.value) : effect.value;
        if (value !== '' && value !== null && !isNaN(value)) {
          acc[effect.key] = value;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    if (!item) {
      const { error } = await supabase.rpc('create_item_and_recipe', {
        p_name: name,
        p_description: description,
        p_icon: icon || null,
        p_stackable: stackable,
        p_type: type,
        p_use_action_text: useActionText || null,
        p_is_craftable: isCraftable,
        p_effects: finalEffects,
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
        effects: finalEffects,
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
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
            
            <div className="space-y-3 rounded-lg border border-slate-700 p-3">
              <Label className="text-gray-300 font-mono">Effets</Label>
              {effectsList.map((effect) => {
                const effectConfig = PREDEFINED_EFFECTS.find(e => e.key === effect.key);
                return (
                  <div key={effect.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Clé</Label>
                      <select
                        value={effect.key}
                        onChange={(e) => handleEffectChange(effect.id, 'key', e.target.value)}
                        className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg text-white text-sm"
                      >
                        <option value="" disabled>Choisir un effet...</option>
                        {PREDEFINED_EFFECTS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Valeur</Label>
                      {effectConfig?.type === 'item_id' ? (
                        <select
                          value={effect.value || ''}
                          onChange={(e) => handleEffectChange(effect.id, 'value', e.target.value)}
                          className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg text-white text-sm"
                        >
                          <option value="" disabled>Choisir une munition...</option>
                          {allItems.map(ammo => <option key={ammo.id} value={ammo.id}>{ammo.name}</option>)}
                        </select>
                      ) : (
                        <Input
                          type="number"
                          value={effect.value || ''}
                          onChange={(e) => handleEffectChange(effect.id, 'value', e.target.value)}
                          className="bg-white/5 border-white/20"
                          disabled={!effect.key}
                        />
                      )}
                    </div>
                    <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveEffect(effect.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              <Button type="button" variant="outline" onClick={handleAddEffect} className="w-full mt-2">
                <PlusCircle className="w-4 h-4 mr-2" /> Ajouter un effet
              </Button>
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