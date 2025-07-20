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
import { X, Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGame } from '@/contexts/GameContext';

interface ListItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onItemListed: () => void;
}

const ListItemModal = ({ isOpen, onClose, inventory, onItemListed }: ListItemModalProps) => {
  const { getIconUrl } = useGame();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
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
      setTimeout(() => {
        setSelectedItem(null);
        setIsSelecting(false);
        setPrice('');
        setQuantity(1);
        setLoading(false);
      }, 200);
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

  const availableInventory = inventory.filter(item => item.slot_position !== null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-sonner-toast]')) {
            e.preventDefault();
          }
        }}
        className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
      >
        <DialogHeader>
          <DialogTitle>Mettre un objet en vente</DialogTitle>
          <DialogDescription>
            {isSelecting ? "Choisissez un objet dans votre inventaire." : "Définissez la quantité et le prix de vente."}
          </DialogDescription>
        </DialogHeader>
        
        {isSelecting ? (
          <div className="max-h-[50vh] overflow-y-auto grid grid-cols-5 gap-2 p-1">
            {availableInventory.length > 0 ? availableInventory
              .filter(item => item.items?.name)
              .sort((a, b) => (a.slot_position || 0) - (b.slot_position || 0))
              .map(item => (
              <button 
                key={item.id} 
                onClick={() => { setSelectedItem(item); setIsSelecting(false); }} 
                className={cn(
                  "relative w-full aspect-square rounded-lg border transition-all duration-200 flex items-center justify-center",
                  "bg-slate-700/50 border-slate-600",
                  "hover:bg-slate-700/80 hover:border-slate-500 cursor-pointer"
                )}
              >
                <div className="absolute inset-0">
                  <ItemIcon iconName={getIconUrl(item.items?.icon) || item.items?.icon} alt={item.items?.name || ''} />
                  {item.quantity > 0 && (
                    <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                      x{item.quantity}
                    </span>
                  )}
                </div>
              </button>
            )) : (
              <p className="col-span-full text-center text-gray-400 py-4">Votre inventaire est vide.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {selectedItem ? (
              <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                  <ItemIcon iconName={getIconUrl(selectedItem.items?.icon) || selectedItem.items?.icon} alt={selectedItem.items?.name || ''} />
                </div>
                <div className="flex-grow">
                  <p className="font-bold">{selectedItem.items?.name}</p>
                  <p className="text-xs text-gray-400">En stock: {selectedItem.quantity}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSelecting(true)} disabled={loading}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button 
                onClick={() => setIsSelecting(true)}
                className="w-full border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center p-4 text-slate-400 hover:bg-slate-700/50 hover:border-slate-500 transition-all min-h-[88px]"
              >
                <PlusCircle className="w-6 h-6 mr-2" />
                <span>Sélectionner un objet</span>
              </button>
            )}

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
                max={selectedItem?.quantity || 1}
                step={1}
                disabled={!selectedItem || selectedItem.quantity <= 1 || loading}
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
                disabled={!selectedItem || loading} 
              />
            </div>

            <Button onClick={handleListItem} className="w-full" disabled={loading || !selectedItem || !price}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Mettre en vente pour ${price || '...'} crédits`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ListItemModal;