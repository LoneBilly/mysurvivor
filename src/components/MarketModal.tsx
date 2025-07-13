import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ShoppingCart, Store, Coins, Trash2, Undo2, Tag, ArrowUpDown, PlusCircle, Eye } from 'lucide-react';
import { InventoryItem } from '@/types/game';
import ItemIcon from './ItemIcon';
import ActionModal from './ActionModal';
import { getItemIconUrl } from '@/utils/imageUrls';
import ListItemModal from './ListItemModal';
import CreditsInfo from './CreditsInfo';

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
  views: number;
  iconUrl?: string;
}

const ListingSkeleton = () => (
  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg mb-2 animate-pulse">
    <div className="w-12 h-12 bg-slate-700/50 rounded-md flex-shrink-0"></div>
    <div className="flex-grow space-y-2">
      <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
      <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
    </div>
    <div className="flex flex-col items-end space-y-2">
      <div className="h-4 bg-slate-700/50 rounded w-12"></div>
      <div className="h-8 bg-slate-700/50 rounded w-20"></div>
    </div>
  </div>
);

const MyListingSkeleton = () => (
  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg animate-pulse">
    <div className="w-12 h-12 bg-slate-700/50 rounded-md flex-shrink-0"></div>
    <div className="flex-grow space-y-2">
      <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
      <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
      <div className="h-3 bg-slate-700/50 rounded w-16 mt-1"></div>
    </div>
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="h-8 bg-slate-700/50 rounded w-24"></div>
      <div className="h-8 bg-slate-700/50 rounded w-20"></div>
    </div>
  </div>
);

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  credits: number;
  saleSlots: number;
  onUpdate: (silent?: boolean) => Promise<void>;
  onPurchaseCredits: () => void;
}

const MarketModal = ({ isOpen, onClose, inventory, credits, saleSlots, onUpdate, onPurchaseCredits }: MarketModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('buy');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [myListings, setMyListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; description: string; onConfirm: () => void; confirmLabel: string; variant?: "default" | "destructive" }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, confirmLabel: 'Confirmer' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isListItemModalOpen, setIsListItemModalOpen] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_market_listings');
    if (error) {
      showError("Impossible de charger les offres du marché.");
    } else {
      const listingsWithUrls = (data as MarketListing[]).map(item => ({
        ...item,
        iconUrl: getItemIconUrl(item.item_icon) || undefined,
      }));
      setListings(listingsWithUrls);
      
      if (listingsWithUrls.length > 0) {
        const listingIds = listingsWithUrls.map(l => l.listing_id);
        supabase.rpc('increment_listing_views', { p_listing_ids: listingIds }).then(({ error }) => {
          if (error) {
            console.error('Failed to increment views:', error.message);
          }
        });
      }
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
        views: d.views,
      }));
      const listingsWithUrls = (formattedData as MarketListing[]).map(item => ({
        ...item,
        iconUrl: getItemIconUrl(item.item_icon) || undefined,
      }));
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

  const handleOpenListItemModal = () => {
    setIsListItemModalOpen(true);
  };

  const handleBuySaleSlot = async () => {
    setModalState({
        isOpen: true,
        title: "Acheter un emplacement",
        description: "Voulez-vous acheter un nouvel emplacement de vente pour 100 crédits ?",
        onConfirm: async () => {
            setLoading(true);
            const { error } = await supabase.rpc('buy_sale_slot');
            if (error) {
                showError(error.message);
            } else {
                showSuccess("Emplacement acheté !");
                await onUpdate(true);
                fetchMyListings();
            }
            setLoading(false);
            setModalState({ ...modalState, isOpen: false });
        },
        confirmLabel: 'Acheter (100 crédits)',
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
        <DialogContent 
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-sonner-toast]')) {
              e.preventDefault();
            }
          }}
          className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col outline-none focus-visible:ring-0"
        >
          <DialogHeader className="text-center flex-shrink-0">
            <Store className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-2xl text-center">Marché</DialogTitle>
            <DialogDescription asChild>
              <CreditsInfo credits={credits} onClick={onPurchaseCredits} />
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow mt-4 min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="buy" className="data-[state=active]:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"><ShoppingCart className="w-4 h-4 mr-2 flex-shrink-0" />Acheter</TabsTrigger>
              <TabsTrigger value="my-listings" className="data-[state=active]:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"><Tag className="w-4 h-4 mr-2 flex-shrink-0" />Vendre</TabsTrigger>
            </TabsList>
            
            <TabsContent value="buy" className="mt-4 flex-grow min-h-0">
              <div className="h-full flex flex-col">
                <div className="flex flex-row gap-2 mb-4 flex-shrink-0">
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
                <div className="flex-grow overflow-y-auto no-scrollbar">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <ListingSkeleton key={i} />)
                  ) : (
                    filteredAndSortedListings.length > 0 ? filteredAndSortedListings.map(l => (
                      <div key={l.listing_id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg mb-2">
                        <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                          <ItemIcon iconName={l.iconUrl || l.item_icon} alt={l.item_name} />
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
                    )) : renderEmptyState("Aucun objet ne correspond à votre recherche.")
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="my-listings" className="mt-4 flex-grow min-h-0">
              <div className="h-full flex flex-col">
                <div className="flex-grow overflow-y-auto no-scrollbar space-y-2">
                  {loading ? (
                    Array.from({ length: saleSlots }).map((_, i) => <MyListingSkeleton key={i} />)
                  ) : (
                    <>
                      {myListings.map(l => (
                        <div key={l.listing_id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                          <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                            <ItemIcon iconName={l.iconUrl || l.item_icon} alt={l.item_name} />
                          </div>
                          <div className="flex-grow">
                            <p className="font-bold">{l.item_name} x{l.quantity}</p>
                            <p className="text-xs text-yellow-400 flex items-center gap-1">{l.price} <Coins size={12} /></p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Eye size={12} /> {l.views} vues</p>
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
                      ))}
                      {myListings.length < saleSlots && Array.from({ length: saleSlots - myListings.length }).map((_, index) => (
                        <button 
                          key={`empty-${index}`} 
                          onClick={handleOpenListItemModal} 
                          className="w-full border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center p-4 text-slate-400 hover:bg-slate-700/50 hover:border-slate-500 transition-all min-h-[88px]"
                        >
                          <PlusCircle className="w-6 h-6 mr-2" />
                          <span>Mettre un objet en vente</span>
                        </button>
                      ))}
                      {myListings.length >= saleSlots && (
                        <button 
                          onClick={handleBuySaleSlot} 
                          className="w-full border-2 border-dashed border-yellow-500/50 bg-yellow-500/10 rounded-lg flex items-center justify-center p-4 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/80 transition-all min-h-[88px]"
                        >
                          <PlusCircle className="w-6 h-6 mr-2" />
                          <span>Acheter un emplacement (100 crédits)</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
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
      <ListItemModal 
        isOpen={isListItemModalOpen}
        onClose={() => setIsListItemModalOpen(false)}
        inventory={inventory}
        onItemListed={() => {
            fetchMyListings();
            onUpdate(true);
        }}
      />
    </>
  );
};

export default MarketModal;