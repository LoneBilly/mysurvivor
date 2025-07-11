import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import InventorySlot from "./InventorySlot";
import { Tables } from "@/types/supabase";

type InventoryItem = Tables<'inventories'> & { items: Tables<'items'> | null };

interface ListItemModalProps {
  inventory: InventoryItem[];
  onListingCreated: () => void;
  children: React.ReactNode;
}

export default function ListItemModal({ inventory, onListingCreated, children }: ListItemModalProps) {
  const [open, setOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantity(item.quantity.toString());
    setIsSelecting(false);
  };

  const handleListIt = async () => {
    if (!selectedItem || !price || !quantity) return;

    const priceInt = parseInt(price);
    const quantityInt = parseInt(quantity);

    if (isNaN(priceInt) || priceInt <= 0 || isNaN(quantityInt) || quantityInt <= 0 || quantityInt > selectedItem.quantity) {
        toast({
            title: "Erreur",
            description: "Veuillez entrer une quantité et un prix valides.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);
    const { error } = await supabase.rpc('list_item_for_sale', {
      p_inventory_id: selectedItem.id,
      p_price: priceInt,
      p_quantity_to_sell: quantityInt
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Votre objet a été mis en vente.",
      });
      onListingCreated();
      setOpen(false);
    }
  };

  const resetState = () => {
    setIsSelecting(true);
    setSelectedItem(null);
    setPrice("");
    setQuantity("1");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetState();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>{isSelecting ? "Choisir un objet à vendre" : "Définir le prix et la quantité"}</DialogTitle>
          <DialogDescription>
            {isSelecting ? "Sélectionnez un objet de votre inventaire." : `Vente de ${selectedItem?.items?.name}`}
          </DialogDescription>
        </DialogHeader>
        
        {isSelecting ? (
          <div className="grid grid-cols-5 gap-2 py-4 max-h-96 overflow-y-auto">
            {inventory
              .filter(item => item.items)
              .map(item => (
                <InventorySlot
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="text-xs"
                >
                  <img src={item.items?.icon ?? ''} alt={item.items?.name} className="w-8 h-8 object-contain mb-1" />
                  <span className="truncate block w-full">{item.items?.name}</span>
                  <span className="font-bold">x{item.quantity}</span>
                </InventorySlot>
              ))}
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0">
                    <InventorySlot>
                        <img src={selectedItem?.items?.icon ?? ''} alt={selectedItem?.items?.name} className="w-10 h-10 object-contain" />
                    </InventorySlot>
                </div>
                <div>
                    <h3 className="font-bold text-lg">{selectedItem?.items?.name}</h3>
                    <p className="text-sm text-slate-400">{selectedItem?.items?.description}</p>
                </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantité (Max: {selectedItem?.quantity})</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                max={selectedItem?.quantity}
                min={1}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Prix total (crédits)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 100"
                min={1}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {!isSelecting && (
            <>
              <Button variant="ghost" onClick={() => setIsSelecting(true)}>Retour</Button>
              <Button onClick={handleListIt} disabled={isLoading}>
                {isLoading ? "Mise en vente..." : "Mettre en vente"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}