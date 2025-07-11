import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { InventoryItem } from '@/types/game';
import ItemIcon from './ItemIcon';
import { X, Loader2 } from 'lucide-react';

interface ListItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onItemListed: () => void;
}

const ListItemModal = ({ isOpen, onClose, inventory, onItemListed }: ListItemModalProps) => {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedItem) {
      setQuantity(1);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedItem(null);
      setPrice('');
      setQuantity(1);
      setLoading(false);
    }
  }, [isOpen]);

  const handleListItem = async () => {
    if (!selectedItem || !price) return;
    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showError("Prix invalide.");
      return;
    }
    if (quantity <= 0 || quantity > selectedItem.quantity) {
      showError("Quantité invalide.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('list_item_for_sale', { 
      p_inventory_id: selectedItem.id, 
      p_price: parsedPrice, 
      p_quantity_to_sell: quantity 
    });
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet mis en vente !");
      onItemListed();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Mettre un objet en vente</DialogTitle>
          <DialogDescription>
            {selectedItem ? `Vous vendez : ${selectedItem.items?.name}` : "Sélectionnez un objet de votre inventaire."}
          </DialogDescription>
        </DialogHeader>
        
        {selectedItem ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
              <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                <ItemIcon iconName={selectedItem.items?.signedIconUrl || selectedItem.items?.icon} alt={selectedItem.items?.name || ''} />
              </div>
              <div className="flex-grow">
                <p className="font-bold">{selectedItem.items?.name}</p>
                <p className="text-xs text-gray-400">En stock: {selectedItem.quantity}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)} disabled={loading}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="quantity-slider">Quantité à vendre</Label>
                <span className="font-mono text-lg font-bold">{quantity}</span>
              </div>
              <Slider
                id="quantity-slider"
                value={[quantity]}
                onValueChange={(value) => setQuantity(value[0])}
                min={1}
                max={selectedItem.quantity}
                step={1}
                disabled={selectedItem.quantity === 1 || loading}
              />
            </div>

            <div>
              <Label htmlFor="sell-price">Prix de vente total</Label>
              <Input 
                id="sell-price" 
                type="number" 
                inputMode="numeric"
                placeholder="Prix en crédits" 
                value={price} 
                onChange={e => setPrice(e.target.value)} 
                className="bg-white/10 border-white/20 mt-1" 
                disabled={loading} 
              />
            </div>

            <Button onClick={handleListItem} className="w-full" disabled={loading || !price}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Mettre en vente pour ${price || '...'} crédits`}
            </Button>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-1">
            {inventory.length > 0 ? inventory.filter(item => item.items?.name).map(item => (
              <button 
                key={item.id} 
                onClick={() => setSelectedItem(item)} 
                className="p-2 bg-slate-700/50 rounded-lg aspect-square flex flex-col items-center justify-between text-center hover:bg-slate-700/80"
              >
                <div className="w-10 h-10 relative flex-shrink-0">
                  <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || ''} />
                </div>
                <div className="flex-grow flex items-center justify-center min-h-0 w-full overflow-hidden">
                  <p className="text-xs text-wrap break-words w-full line-clamp-2">{item.items?.name}</p>
                </div>
                <p className="text-xs font-bold flex-shrink-0">x{item.quantity}</p>
              </button>
            )) : (
              <p className="col-span-full text-center text-gray-400 py-4">Votre inventaire est vide.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ListItemModal;