import { useState, useEffect, FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// Mock data and functions to make the component self-contained for the example
interface Item {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
  stackable: boolean;
  type: string;
  use_action_text?: string;
  recipe_id?: number;
  effects?: Record<string, any>;
}

async function getAvailableIcons(): Promise<string[]> {
  // In a real application, this would fetch from an API or edge function.
  return Promise.resolve([
    "sword.webp",
    "shield.webp",
    "potion.webp",
    ".emptyfolderplaceholder",
  ]);
}

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onSave: (item: Item) => void;
}

export function ItemFormModal({
  isOpen,
  onClose,
  item,
  onSave,
}: ItemFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [stackable, setStackable] = useState(true);
  const [type, setType] = useState("Items divers");
  const [useActionText, setUseActionText] = useState("");
  
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getAvailableIcons().then(setAvailableIcons);
  }, []);

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setDescription(item.description || "");
      setIcon(item.icon || "");
      setStackable(item.stackable ?? true);
      setType(item.type || "Items divers");
      setUseActionText(item.use_action_text || "");
    } else {
      // Reset form for new item
      setName("");
      setDescription("");
      setIcon("");
      setStackable(true);
      setType("Items divers");
      setUseActionText("");
    }
  }, [item, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const savedItem = { ...item, name, description, icon, stackable, type, use_action_text: useActionText };
    // Simulate saving
    setTimeout(() => {
      onSave(savedItem);
      onClose();
      setIsLoading(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{item ? "Modifier l'objet" : "Créer un objet"}</DialogTitle>
          <DialogDescription>
            Gérez les propriétés de l'objet ici.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="icon" className="text-right">
                Icône
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <select
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="flex-grow p-2 border rounded-md bg-background"
                >
                  <option value="">-- Choisir une icône --</option>
                  {availableIcons
                    .filter((iconName) => iconName !== ".emptyfolderplaceholder")
                    .map((iconName) => (
                      <option key={iconName} value={iconName}>
                        {iconName}
                      </option>
                    ))}
                </select>
                {icon && (
                  <img
                    src={`/${icon}`}
                    alt={icon}
                    className="w-10 h-10 object-contain bg-gray-200 rounded-md p-1"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
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
              <Input
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="useActionText" className="text-right">
                Texte d'action
              </Label>
              <Input
                id="useActionText"
                value={useActionText}
                onChange={(e) => setUseActionText(e.target.value)}
                className="col-span-3"
                placeholder="Ex: Manger, Boire, Lire"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Options</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="stackable"
                  checked={stackable}
                  onCheckedChange={(checked) => setStackable(!!checked)}
                />
                <label
                  htmlFor="stackable"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Empilable (Stackable)
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}