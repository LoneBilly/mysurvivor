import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Store, ShoppingCart, Tag, Coins, Trash2, Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { MarketListing, InventoryItem } from '@/types/game';
import ItemIcon from './ItemIcon';
import ActionModal from './ActionModal';
import MarketBuyTab from './MarketBuyTab';

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  saleSlots: number;
  onAction: () => Promise<void>;
}

const MarketModal = ({ isOpen, onClose, inventory, saleSlots, onAction }: MarketModalProps) => {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemToPrice, setItemToPrice] = useState<InventoryItem | null>(null);
  const [price, setPrice] = useState('');
  const [cancelAction, setCancelAction] = useState<{ listing: MarketListing; action: 'buy_back' | 'discard' } | null>(null);

  const fetchMyListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('market_listings')
      .select('*, items(*)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      showError("Impossible de charger vos objets en vente.");
    } else {
      setMyListings(data as MarketListing[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchMyListings();
    }
  }, [isOpen, fetchMyListings]);

  const handleListItem = async () => {
    if (!itemToPrice || !price) return;
    const priceValue = parseInt(price, 10);
    if (isNaN(priceValue) || priceValue <= 0) {
      showError("Veuillez entrer un prix valide.");
      return;
    }

    const { error } = await supabase.rpc('list_item_for_sale', {
      p_inventory_id: itemToPrice.id,
      p_price: priceValue,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet mis en vente !");
      setItemToPrice(null);
      setPrice('');
      await onAction();
      await fetchMyListings();
    }
  };

  const handleCancelListing = async () => {
    if (!cancelAction) return;
    const { error } = await supabase.rpc('cancel_listing', {
      p_listing_id: cancelAction.listing.id,
      p_action: cancelAction.action,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Annonce retirée.");
      setCancelAction(null);
      await onAction();
      await fetchMyListings();
    }
  };

  const SellTab = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-700 mb-4">
        <h3 className="font-bold text-lg mb-2">Mes objets en vente ({myListings.length}/{saleSlots})</h3>
        {loading ? <Loader2 className="animate-spin mx-auto" /> :
          myListings.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {myListings.map(listing => (
                <div key={listing.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-slate-800/60 rounded-md gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-black/20 rounded-md flex-shrink-0 relative p-1">
                      <ItemIcon iconName={listing.items?.icon} alt={listing.items?.name || ''} />
                    </div>
                    <div>
                      <p className="font-semibold">{listing.items?.name} (x{listing.quantity})</p>
                      <p className="text-sm text-yellow-400 flex items-center gap-1"><Coins size={14} /> {listing.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end w-full sm:w-auto gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setCancelAction({ listing, action: 'buy_back' })}><Undo2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="hover:text-red-500" onClick={() => setCancelAction({ listing, action: 'discard' })}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400">Vous n'avez aucun objet en vente.</p>
        }
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="font-bold text-lg mb-2">Mettre en vente depuis l'inventaire</h3>
        <div className="flex-1 overflow-y-auto space-y-2 bg-slate-900/50 rounded-lg border border-slate-700 p-2">
          {inventory.length > 0 ? inventory.map(item => (
            <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-slate-800/60 rounded-md gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-black/20 rounded-md flex-shrink-0 relative p-1">
                  <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || ''} />
                </div>
                <p className="font-semibold truncate">{item.items?.name} (x{item.quantity})</p>
              </div>
              <Button className="w-full sm:w-auto" size="sm" onClick={() => setItemToPrice(item)} disabled={myListings.length >= saleSlots}>Vendre</Button>
            </div>
          )) : <p className="text-slate-400 text-center p-4">Votre inventaire est vide.</p>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
          <DialogHeader className="text-center">
            <Store className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-2xl">Marché</DialogTitle>
            <DialogDescription className="text-gray-300">Achetez et vendez des objets avec d'autres survivants.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="buy" className="flex-1 flex flex-col min-h-0 mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy"><ShoppingCart className="w-4 h-4 mr-2" />Acheter</TabsTrigger>
              <TabsTrigger value="sell"><Tag className="w-4 h-4 mr-2" />Vendre</TabsTrigger>
            </TabsList>
            <TabsContent value="buy" className="flex-1 mt-2 h-full">
              <MarketBuyTab onAction={onAction} />
            </TabsContent>
            <TabsContent value="sell" className="flex-1 mt-2 h-full">
              <SellTab />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemToPrice} onOpenChange={() => setItemToPrice(null)}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <DialogTitle>Mettre en vente: {itemToPrice?.items?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="price" className="text-sm font-medium">Prix de vente</label>
            <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1 bg-white/5 border-white/20" placeholder="Entrez un prix en crédits" />
          </div>
          <Button onClick={handleListItem}>Mettre en vente</Button>
        </DialogContent>
      </Dialog>

      <ActionModal
        isOpen={!!cancelAction}
        onClose={() => setCancelAction(null)}
        title="Retirer l'objet de la vente"
        description={
          cancelAction?.action === 'buy_back'
            ? `Voulez-vous racheter votre objet pour ${Math.floor((cancelAction.listing.price || 0) * 0.4)} crédits ? L'objet retournera dans votre inventaire.`
            : "Êtes-vous sûr de vouloir jeter cet objet ? Il sera perdu définitivement."
        }
        actions={[
          { label: "Confirmer", onClick: handleCancelListing, variant: "destructive" },
          { label: "Annuler", onClick: () => setCancelAction(null), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default MarketModal;