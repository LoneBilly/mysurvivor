import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Item, CraftingRecipe } from "@/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
  onSave: (item: Partial<Item>) => void;
  recipes: CraftingRecipe[];
}

const ITEM_TYPES = [
  "Items divers",
  "Ressource",
  "Nourriture",
  "Armure",
  "Sac à dos",
  "Chaussures",
  "Vehicule",
  "Blueprint",
  "Combustible",
  "Outil",
];

export function ItemFormModal({ isOpen, onClose, item, onSave, recipes }: ItemFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [stackable, setStackable] = useState(true);
  const [type, setType] = useState("Items divers");
  const [useActionText, setUseActionText] = useState<string | null>(null);
  const [effects, setEffects] = useState<string>("");
  const [recipeId, setRecipeId] = useState<number | null>(null);
  const [isCraftable, setIsCraftable] = useState(false);

  const [iconList, setIconList] = useState<string[]>([]);

  useEffect(() => {
    const fetchIcons = async () => {
      const { data, error } = await supabase.storage.from("assets").list("items", {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        console.error("Error fetching icons:", error);
        toast.error("Erreur lors de la récupération des icônes.");
      } else if (data) {
        const iconNames = data.map((file) => file.name);
        setIconList(iconNames);
      }
    };

    fetchIcons();
  }, []);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || "");
      setIcon(item.icon || "");
      setStackable(item.stackable);
      setType(item.type);
      setUseActionText(item.use_action_text || null);
      setEffects(JSON.stringify(item.effects || {}, null, 2));
      setRecipeId(item.recipe_id || null);
      setIsCraftable(!!item.recipe_id);
    } else {
      setName("");
      setDescription("");
      setIcon("");
      setStackable(true);
      setType("Items divers");
      setUseActionText(null);
      setEffects("{}");
      setRecipeId(null);
      setIsCraftable(false);
    }
  }, [item, isOpen]);

  const handleSave = () => {
    let parsedEffects = {};
    try {
      parsedEffects = effects ? JSON.parse(effects) : {};
    } catch (error) {
      toast.error("Le JSON des effets est invalide.");
      return;
    }

    const itemData: Partial<Item> = {
      ...item,
      name,
      description,
      icon,
      stackable,
      type,
      use_action_text: useActionText,
      effects: parsedEffects,
      recipe_id: isCraftable ? recipeId : null,
    };
    onSave(itemData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Modifier l'item" : "Créer un item"}</DialogTitle>
          <DialogDescription>
            {item ? "Modifiez les détails de l'item." : "Créez un nouvel item pour le jeu."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="icon" className="text-right">
              Icone
            </Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger id="icon" className="col-span-3">
                <SelectValue placeholder="Choisir une icône" />
              </SelectTrigger>
              <SelectContent>
                {iconList
                  .filter((iconFile) => iconFile !== ".emptyfolderplaceholder")
                  .map((iconFile) => (
                    <SelectItem key={iconFile} value={iconFile}>
                      <div className="flex items-center">
                        <img
                          src={`https://odnnuqgkkzhmkxfafzhp.supabase.co/storage/v1/object/public/assets/items/${iconFile}`}
                          alt={iconFile}
                          className="w-6 h-6 mr-2"
                        />
                        {iconFile}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nom
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="useActionText" className="text-right">
              Texte d'action
            </Label>
            <Input
              id="useActionText"
              value={useActionText || ""}
              onChange={(e) => setUseActionText(e.target.value)}
              className="col-span-3"
              placeholder="Ex: Manger, Boire, Lire"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stackable" className="text-right">
              Empilable
            </Label>
            <Switch id="stackable" checked={stackable} onCheckedChange={setStackable} />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="effects" className="text-right pt-2">
              Effets (JSON)
            </Label>
            <Textarea
              id="effects"
              value={effects}
              onChange={(e) => setEffects(e.target.value)}
              className="col-span-3 font-mono"
              rows={5}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isCraftable" className="text-right">
              Est craftable
            </Label>
            <Switch id="isCraftable" checked={isCraftable} onCheckedChange={setIsCraftable} />
          </div>
          {isCraftable && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recipeId" className="text-right">
                Recette
              </Label>
              <Select value={recipeId?.toString()} onValueChange={(val) => setRecipeId(Number(val))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Choisir une recette" />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id.toString()}>
                      Recette #{recipe.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Annuler
          </Button>
          <Button onClick={handleSave}>Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}