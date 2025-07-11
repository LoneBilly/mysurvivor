import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ShoppingCart, Tag, Store, Coins, Trash2, Undo2, GanttChartSquare, ArrowUpDown } from 'lucide-react';
import { InventoryItem } from '@/types/game';
import ItemIcon from './ItemIcon';
import ActionModal from './ActionModal';
import { getCachedSignedUrl } from '@/utils/iconCache';

export interface MarketListing {
  listing_id: number;
  seller_id: string;
  seller_username: string;
  item_id: number;
  item_name: string;
  item_icon: string | null;
  quantity: number;
  price: number;
  created_at: string;
  signedIconUrl?: string;
}

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  credits: number;
  saleSlots: number;
  onUpdate: (silent?: boolean) => Promise<void>;
}

const MarketModal = ({ isOpen, onClose, inventory, credits, saleSlots, onUpdate }: MarketModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('buy');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [myListings, setMyListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; description: string; onConfirm: () => void; confirmLabel: string; variant?: "default" | "destructive" }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, confirmLabel: 'Confirmer' });
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellQuantity, setSellQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (sellItem) {
      setSellQuantity(1);
    }
  }, [sellItem]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_market_listings');
    if (error) {
      showError("Impossible de charger les offres du marché.");
    } else {
      const listingsWithUrls = await Promise.all(
        (data as MarketListing[]).map(async (item) => {
          if (item.item_icon && item.item_icon.includes('.')) {
            const signedUrl = await getCachedSignedUrl(item.item_icon);
            return { ...item, signedIconUrl: signedUrl || undefined };
          }
          return item;
        })
      );
      setListings(listingsWithUrls);
    }
    setLoading(false);
  }, []);

  const fetchMyListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('market_listings')
      .select('*, items(name, icon)')
      .eq('seller_id', user.id);
    
    if (error) {
      showError("Impossible de charger vos offres.");
    } else {
      const formattedData = data.map(d => ({
        listing_id: d.id,
        seller_id: d.seller_id,
        seller_username: user.email || 'Vous',
        item_id: d.item_id,
        item_name: d.items?.name || 'Objet inconnu',
        item_icon: d.items?.icon || null,
        quantity: d.quantity,
        price: d.price,
        created_at: d.created_at,
      }));
      const listingsWithUrls = await Promise.all(
        (formattedData as MarketListing[]).map(async (item) => {
          if (item.item_icon && item.item_icon.includes('.')) {
            const signedUrl = await getCachedSignedUrl(item.item_icon);
            return { ...item, signedIconUrl: signedUrl || undefined };
          }
          return item;
        })
      );
      setMyListings(listingsWithUrls);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'buy') fetchListings();
      if (activeTab === 'my-listings') fetchMyListings();
    }
  }, [isOpen, activeTab, fetchListings, fetchMyListings]);

  const handleBuy = (listing: MarketListing) => {
    setModalState({
      isOpen: true,
      title: `Acheter ${listing.item_name}`,
      description: `Voulez-vous acheter ${listing.quantity}x ${listing.item_name} pour ${listing.price} crédits ?`,
      onConfirm: async () => {
        setLoading(true);
        const { error } = await supabase.rpc('buy_market_item', { p_listing_id: listing.listing_id });
        if (error) {
          showError(error.message);
        } else {
          showSuccess("Achat réussi !");
          onUpdate(true);
          fetchListings();
        }
        setLoading(false);
        setModalState({ ...modalState, isOpen: false });
      },
      confirmLabel: 'Acheter',
    });
  };

  const handleSell = () => {
    if (!sellItem || !sellPrice) return;
    const price = parseInt(sellPrice, 10);
    if (isNaN(price) || price <= 0) {
      showError("Prix invalide.");
      return;
    }
    if (sellQuantity <= 0 || sellQuantity > sellItem.quantity) {
      showError("Quantité invalide.");
      return;
    }
    setModalState({
      isOpen: true,
      title: `Vendre ${sellItem.items?.name}`,
      description: `Mettre en vente ${sellQuantity}x ${sellItem.items?.name} pour ${price} crédits ?`,
      onConfirm: async () => {
        setLoading(true);
        const { error } = await supabase.rpc('list_item_for_sale', { p_inventory_id: sellItem.id, p_price: price, p_quantity_to_sell: sellQuantity });
        if (error) {
          showError(error.message);
        } else {
          showSuccess("Objet mis en vente !");
          onUpdate(true);
          fetchMyListings();
        }
        setLoading(false);
        setSellItem(null);
        setSellPrice('');
        setModalState({ ...modalState, isOpen: false });
      },
      confirmLabel: 'Confirmer',
    });
  };

  const handleCancelListing = (listing: MarketListing, action: 'buy_back' | 'discard') => {
    const buyBackPrice = Math.floor(listing.price * 0.4);
    const title = action === 'buy_back' ? "Racheter votre objet" : "Jeter votre objet";
    const description = action === 'buy_back' 
      ? `Racheter cet objet vous coûtera ${buyBackPrice} crédits. L'objet retournera dans votre inventaire.`
      : "Cet objet sera définitivement perdu. Cette action est irréversible.";

    setModalState({
      isOpen: true,
      title,
      description,
      variant: action === 'discard' ? 'destructive' : 'default',
      onConfirm: async () => {
        setLoading(true);
        const { error } = await supabase.rpc('cancel_listing', { p_listing_id: listing.listing_id, p_action: action });
        if (error) {
          showError(error.message);
        } else {
          showSuccess("Action réussie !");
          onUpdate(true);
          fetchMyListings();
        }
        setLoading(false);
        setModalState({ ...modalState, isOpen: false });
      },
      confirmLabel: action === 'buy_back' ? 'Racheter' : 'Jeter',
    });
  };

  const renderEmptyState = (message: string) => (
    <div className="text-center text-gray-400 py-10">{message}</div>
  );

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const filteredAndSortedListings = listings
    .filter(l => l.item_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.price - b.price;
      return b.price - a.price;
    });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col outline-none focus-visible:ring-0">
          <DialogHeader className="text-center">
            <Store className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-2xl">Marché</DialogTitle>
            <DialogDescription className="flex items-center justify-center gap-2 text-yellow-400 font-mono">
              <Coins className="w-4 h-4" /> {credits} crédits
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow mt-4 min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="buy" className="data-[state=active]:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"><ShoppingCart className="w-4 h-4 mr-2" />Acheter</TabsTrigger>
              <TabsTrigger value="sell" className="data-[state=active]:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"><Tag className="w-4 h-4 mr-2" />Vendre</TabsTrigger>
              <TabsTrigger value="my-listings" className="data-[state=active]:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"><GanttChartSquare className="w-4 h-4 mr-2" />Mes Ventes</TabsTrigger>
            </TabsList>
            <div className="flex-grow mt-4 overflow-y-auto no-scrollbar">
              {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div> :
                <>
                  <TabsContent value="buy">
                    <div className="flex flex-row gap-2 mb-4">
                      <Input 
                        placeholder="Rechercher un objet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white/10 border-white/20 flex-grow"
                      />
                      <Button variant="outline" onClick={toggleSortOrder} className="bg-white/10 border-white/20 flex-shrink-0">
                        <ArrowUpDown className="w-4 h-4" />
                      </Button>
                    </div>
                    {filteredAndSortedListings.length > 0 ? filteredAndSortedListings.map(l => (
                      <div key={l.listing_id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg mb-2">
                        <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                          <ItemIcon iconName={l.signedIconUrl || l.item_icon} alt={l.item_name} />
                        </div>
                        <div className="flex-grow">
                          <p className="font-bold">{l.item_name} x{l.quantity}</p>
                          <p className="text-xs text-gray-400">Vendu par: {l.seller_username}</p>
                        </div>
                        <div className="flex flex-col items-center sm:items-end">
                          <p className="font-bold flex items-center justify-center sm:justify-end gap-1 text-yellow-400">{l.price} <Coins size={14} /></p>
                          <Button size="sm" onClick={() => handleBuy(l)} disabled={credits < l.price} className="mt-1 w-full sm:w-auto">Acheter</Button>
                        </div>
                      </div>
                    )) : renderEmptyState("Aucun objet ne correspond à votre recherche.")}
                  </TabsContent>
                  <TabsContent value="sell">
                    {myListings.length >= saleSlots ? renderEmptyState(`Vous avez atteint votre limite de ${saleSlots} emplacements de vente.`) :
                      sellItem ? (
                        <div className="p-4 bg-white/5 rounded-lg space-y-6">
                          <h3 className="font-bold text-lg">Vendre {sellItem.items?.name}</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="quantity-slider">Quantité</Label>
                              <span className="font-mono text-lg font-bold">{sellQuantity}</span>
                            </div>
                            <Slider
                              id="quantity-slider"
                              value={[sellQuantity]}
                              onValueChange={(value) => setSellQuantity(value[0])}
                              min={1}
                              max={sellItem.quantity}
                              step={1}
                              disabled={sellItem.quantity === 1}
                            />
                          </div>
                          <div>
                            <Label htmlFor="sell-price">Prix de vente (pour {sellQuantity} unité(s))</Label>
                            <Input id="sell-price" type="number" placeholder="Prix total" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="bg-white/10 border-white/20 mt-1" />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button onClick={handleSell}>Mettre en vente</Button>
                            <Button variant="secondary" onClick={() => setSellItem(null)}>Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {inventory.map(item => (
                            <button key={item.id} onClick={() => setSellItem(item)} className="p-2 bg-slate-700/50 rounded-lg aspect-square flex flex-col items-center justify-center text-center hover:bg-slate-700/80">
                              <div className="w-10 h-10 relative mb-1 flex-shrink-0">
                                <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || ''} />
                              </div>
                              <div className="flex-grow flex items-center justify-center min-h-0">
                                <p className="text-xs text-wrap break-words">{item.items?.name}</p>
                              </div>
                              <p className="text-xs font-bold flex-shrink-0">x{item.quantity}</p>
                            </button>
                          ))}
                        </div>
                      )
                    }
                  </TabsContent>
                  <TabsContent value="my-listings">
                    <p className="text-sm text-gray-400 mb-2">Emplacements de vente utilisés: {myListings.length} / {saleSlots}</p>
                    {myListings.length > 0 ? myListings.map(l => (
                      <div key={l.listing_id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg mb-2">
                        <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                          <ItemIcon iconName={l.signedIconUrl || l.item_icon} alt={l.item_name} />
                        </div>
                        <div className="flex-grow">
                          <p className="font-bold">{l.item_name} x{l.quantity}</p>
                          <p className="text-xs text-yellow-400 flex items-center gap-1">{l.price} <Coins size={12} /></p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleCancelListing(l, 'buy_back')} className="flex items-center gap-1">
                            <Undo2 size={14} /> Racheter ({Math.floor(l.price * 0.4)})
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleCancelListing(l, 'discard')} className="flex items-center gap-1">
                            <Trash2 size={14} /> Jeter
                          </Button>
                        </div>
                      </div>
                    )) : renderEmptyState("Vous n'avez aucun objet en vente.")}
                  </TabsContent>
                </>
              }
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
      <ActionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        description={modalState.description}
        actions={[
          { label: modalState.confirmLabel, onClick: modalState.onConfirm, variant: modalState.variant || 'default' },
          { label: "Annuler", onClick: () => setModalState({ ...modalState, isOpen: false }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default MarketModal;