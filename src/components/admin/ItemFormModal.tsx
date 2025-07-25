"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/src/integrations/supabase/client";
import { toast } from "sonner";
import { Item } from "@/src/lib/types";
import { Loader2 } from "lucide-react";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: Item | null;
}

const itemTypes = [
  "Items divers",
  "Nourriture",
  "Outil",
  "Arme",
  "Armure",
  "Sac à dos",
  "Chaussures",
  "Vehicule",
  "Ressource",
  "Blueprint",
];

const ItemFormModal: React.FC<ItemFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [icon, setIcon] = useState(initialData?.icon || "");
  const [stackable, setStackable] = useState(initialData?.stackable || false);
  const [type, setType] = useState(initialData?.type || "Items divers");
  const [useActionText, setUseActionText] = useState(initialData?.use_action_text || "");
  const [isCraftable, setIsCraftable] = useState(!!initialData?.recipe_id);
  const [recipeResultQuantity, setRecipeResultQuantity] = useState(initialData?.recipe_id ? 1 : 1);
  const [recipeSlot1ItemId, setRecipeSlot1ItemId] = useState<number | null>(null);
  const [recipeSlot1Quantity, setRecipeSlot1Quantity] = useState<number | null>(null);
  const [recipeSlot2ItemId, setRecipeSlot2ItemId] = useState<number | null>(null);
  const [recipeSlot2Quantity, setRecipeSlot2Quantity] = useState<number | null>(null);
  const [recipeSlot3ItemId, setRecipeSlot3ItemId] = useState<number | null>(null);
  const [recipeSlot3Quantity, setRecipeSlot3Quantity] = useState<number | null>(null);
  const [recipeCraftTimeSeconds, setRecipeCraftTimeSeconds] = useState(initialData?.recipe_id ? 10 : 10);
  const [effects, setEffects] = useState<string>(JSON.stringify(initialData?.effects || {}, null, 2));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setIcon(initialData.icon || "");
      setStackable(initialData.stackable);
      setType(initialData.type);
      setUseActionText(initialData.use_action_text || "");
      setIsCraftable(!!initialData.recipe_id);
      setEffects(JSON.stringify(initialData.effects || {}, null, 2));

      if (initialData.recipe_id) {
        fetchRecipeDetails(initialData.recipe_id);
      } else {
        resetRecipeFields();
      }
    } else {
      resetForm();
    }
  }, [initialData]);

  const fetchRecipeDetails = async (recipeId: number) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crafting_recipes")
      .select("*")
      .eq("id", recipeId)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement de la recette: " + error.message);
    } else if (data) {
      setRecipeResultQuantity(data.result_quantity);
      setRecipeSlot1ItemId(data.slot1_item_id);
      setRecipeSlot1Quantity(data.slot1_quantity);
      setRecipeSlot2ItemId(data.slot2_item_id);
      setRecipeSlot2Quantity(data.slot2_quantity);
      setRecipeSlot3ItemId(data.slot3_item_id);
      setRecipeSlot3Quantity(data.slot3_quantity);
      setRecipeCraftTimeSeconds(data.craft_time_seconds);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIcon("");
    setStackable(false);
    setType("Items divers");
    setUseActionText("");
    setIsCraftable(false);
    setEffects("{}");
    resetRecipeFields();
  };

  const resetRecipeFields = () => {
    setRecipeResultQuantity(1);
    setRecipeSlot1ItemId(null);
    setRecipeSlot1Quantity(null);
    setRecipeSlot2ItemId(null);
    setRecipeSlot2Quantity(null);
    setRecipeSlot3ItemId(null);
    setRecipeSlot3Quantity(null);
    setRecipeCraftTimeSeconds(10);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let parsedEffects = {};
      try {
        parsedEffects = JSON.parse(effects);
      } catch (e) {
        toast.error("Effets JSON invalides.");
        setLoading(false);
        return;
      }

      if (initialData) {
        // Update existing item
        const { error: itemError } = await supabase
          .from("items")
          .update({
            name,
            description,
            icon,
            stackable,
            type,
            use_action_text,
            effects: parsedEffects,
          })
          .eq("id", initialData.id);

        if (itemError) throw itemError;

        if (isCraftable) {
          const { error: recipeError } = await supabase
            .from("crafting_recipes")
            .upsert(
              {
                id: initialData.recipe_id || undefined, // Use undefined for new recipe, id for update
                result_item_id: initialData.id,
                result_quantity: recipeResultQuantity,
                slot1_item_id: recipeSlot1ItemId,
                slot1_quantity: recipeSlot1Quantity,
                slot2_item_id: recipeSlot2ItemId,
                slot2_quantity: recipeSlot2Quantity,
                slot3_item_id: recipeSlot3ItemId,
                slot3_quantity: recipeSlot3Quantity,
                craft_time_seconds: recipeCraftTimeSeconds,
              },
              { onConflict: "result_item_id", ignoreDuplicates: false }
            );
          if (recipeError) throw recipeError;
        } else if (initialData.recipe_id) {
          // If it was craftable but now it's not, delete the recipe
          const { error: deleteRecipeError } = await supabase
            .from("crafting_recipes")
            .delete()
            .eq("id", initialData.recipe_id);
          if (deleteRecipeError) throw deleteRecipeError;
        }
        toast.success("Objet mis à jour avec succès !");
      } else {
        // Create new item
        const { data: newItem, error: itemError } = await supabase
          .rpc("create_item_and_recipe", {
            p_name: name,
            p_description: description,
            p_icon: icon,
            p_stackable: stackable,
            p_type: type,
            p_use_action_text: useActionText,
            p_is_craftable: isCraftable,
            p_effects: parsedEffects,
            p_recipe_result_quantity: recipeResultQuantity,
            p_recipe_slot1_item_id: recipeSlot1ItemId,
            p_recipe_slot1_quantity: recipeSlot1Quantity,
            p_recipe_slot2_item_id: recipeSlot2ItemId,
            p_recipe_slot2_quantity: recipeSlot2Quantity,
            p_recipe_slot3_item_id: recipeSlot3ItemId,
            p_recipe_slot3_quantity: recipeSlot3Quantity,
            p_recipe_craft_time_seconds: recipeCraftTimeSeconds,
          })
          .select()
          .single();

        if (itemError) throw itemError;
        toast.success("Objet créé avec succès !");
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 text-gray-100 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">{initialData ? "Modifier l'objet" : "Créer un nouvel objet"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="icon" className="text-gray-300 font-mono">Icône (nom de fichier)</Label>
            <div className="flex items-center gap-2 mt-1 col-span-3">
              <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/items/${icon}`} alt="Item Icon" className="w-10 h-10 object-contain" />
                ) : (
                  <span className="text-gray-500 text-xs">No Icon</span>
                )}
              </div>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="col-span-3 bg-gray-800 text-gray-100 border-gray-700"
                placeholder="e.g., wood.webp"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-gray-300 font-mono">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3 bg-gray-800 text-gray-100 border-gray-700"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-gray-300 font-mono">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 bg-gray-800 text-gray-100 border-gray-700"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-gray-300 font-mono">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="col-span-3 bg-gray-800 text-gray-100 border-gray-700">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-gray-100 border-gray-700">
                {itemTypes.map((itemType) => (
                  <SelectItem key={itemType} value={itemType}>
                    {itemType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="useActionText" className="text-gray-300 font-mono">Texte d'action d'utilisation</Label>
            <Input
              id="useActionText"
              value={useActionText}
              onChange={(e) => setUseActionText(e.target.value)}
              className="col-span-3 bg-gray-800 text-gray-100 border-gray-700"
              placeholder="e.g., Manger, Boire, Lire"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stackable" className="text-gray-300 font-mono">Empilable</Label>
            <Checkbox
              id="stackable"
              checked={stackable}
              onCheckedChange={(checked) => setStackable(!!checked)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="effects" className="text-gray-300 font-mono">Effets (JSON)</Label>
            <Textarea
              id="effects"
              value={effects}
              onChange={(e) => setEffects(e.target.value)}
              className="col-span-3 bg-gray-800 text-gray-100 border-gray-700 font-mono text-xs"
              rows={6}
              placeholder={`{\n  "restaure_vie": 20,\n  "restaure_faim": 30\n}`}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isCraftable" className="text-gray-300 font-mono">Fabricable</Label>
            <Checkbox
              id="isCraftable"
              checked={isCraftable}
              onCheckedChange={(checked) => setIsCraftable(!!checked)}
              className="col-span-3"
            />
          </div>

          {isCraftable && (
            <>
              <h3 className="text-lg font-semibold text-gray-100 mt-4 col-span-4">Détails de la recette</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recipeResultQuantity" className="text-gray-300 font-mono">Quantité de résultat</Label>
                <Input
                  id="recipeResultQuantity"
                  type="number"
                  value={recipeResultQuantity}
                  onChange={(e) => setRecipeResultQuantity(parseInt(e.target.value))}
                  className="col-span-3 bg-gray-800 text-gray-100 border-gray-700"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recipeCraftTimeSeconds" className="text-gray-300 font-mono">Temps de fabrication (s)</Label>
                <Input
                  id="recipeCraftTimeSeconds"
                  type="number"
                  value={recipeCraftTimeSeconds}
                  onChange={(e) => setRecipeCraftTimeSeconds(parseInt(e.target.value))}
                  className="col-span-3 bg-gray-800 text-gray-100 border-gray-700"
                />
              </div>
              {[1, 2, 3].map((slotNum) => (
                <React.Fragment key={slotNum}>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`slot${slotNum}ItemId`} className="text-gray-300 font-mono">Ingrédient {slotNum} (ID)</Label>
                    <Input
                      id={`slot${slotNum}ItemId`}
                      type="number"
                      value={eval(`recipeSlot${slotNum}ItemId`) || ""}
                      onChange={(e) => eval(`setRecipeSlot${slotNum}ItemId`)(e.target.value ? parseInt(e.target.value) : null)}
                      className="col-span-3 bg-gray-800 text-gray-100 border-gray-700"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`slot${slotNum}Quantity`} className="text-gray-300 font-mono">Quantité {slotNum}</Label>
                    <Input
                      id={`slot${slotNum}Quantity`}
                      type="number"
                      value={eval(`recipeSlot${slotNum}Quantity`) || ""}
                      onChange={(e) => eval(`setRecipeSlot${slotNum}Quantity`)(e.target.value ? parseInt(e.target.value) : null)}
                      className="col-span-3 bg-gray-800 text-gray-100 border-gray-700"
                    />
                  </div>
                </React.Fragment>
              ))}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-gray-100 border-gray-700 hover:bg-gray-700">
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Sauvegarder les modifications" : "Créer l'objet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormModal;