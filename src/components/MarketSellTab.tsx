import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GameState, MarketListing, InventoryItem } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Tag, Trash2, Undo2, Coins } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import ItemIcon from './ItemIcon';
import ActionModal from './ActionModal';

interface MarketSellTabProps {
  gameState: GameState;
  onRefresh: () => void;
}

const MarketSellTab = ({ gameState, onRefresh }: MarketSellTabProps) => {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [price, setPrice] = useState('');
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; title: string; description: string; onConfirm: () => void; confirmLabel: string; confirmVariant: 'destructive' | 'default' }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, confirmLabel: '', confirmVariant: 'default' });

  const fetchMyListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('market_listings')
      .select('*, items(*)')
      .eq('seller_id', user.id);
    
    if (error) {
      showError("Impossible de charger vos annonces.");
    } else {
      setMyListings(data as MarketListing[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setPrice('');
  };

  const handleListForSale = async () => {
    if (!selectedItem || !price) {
      showError("Veuillez sélectionner un objet et définir un prix.");
      return;
    }
    const priceInt = parseInt(price, 10);
    if (isNaN(priceInt) || priceInt <= 0) {
      showError("Le prix doit être un nombre positif.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('list_item_for_sale', {
      p_inventory_id: selectedItem.id,
      p_price: priceInt,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet mis en vente !");
      setSelectedItem(null);
      setPrice('');
      fetchMyListings();
      onRefresh();
    }
    setLoading(false);
  };

  const handleCancelListing = async (listingId: number, action: 'discard' | 'buy_back', itemPrice: number) => {
    const onConfirm = async () => {
      setLoading(true);
      const { error } = await supabase.rpc('cancel_listing', {
        p_listing_id: listingId,
        p_action: action,
      });
      if (error) {
        showError(error.message);
      } else {
        showSuccess("Annonce annulée.");
        fetchMyListings();
        onRefresh();
      }
      setLoading(false);
      setActionModal({ ...actionModal, isOpen: false });
    };

    if (action === 'discard') {
      setActionModal({ isOpen: true, title: "Jeter l'objet ?", description: "Cette action est irréversible. L'objet sera perdu.", onConfirm, confirmLabel: "Jeter", confirmVariant: 'destructive' });
    } else {
      const buyBackPrice = Math.floor(itemPrice * 0.4);
      setActionModal({ isOpen: true, title: "Racheter l'objet ?", description: `Cela vous coûtera ${buyBackPrice} crédits.`, onConfirm, confirmLabel: "Racheter", confirmVariant: 'default' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left side: Create listing */}
      <Card className="bg-gray-800/50 border-gray-700 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Tag /> Mettre en vente</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-gray-300">1. Choisissez un objet dans votre inventaire</h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-800 max-h-48 overflow-y-auto">
              {gameState.inventaire.map(item => (
                <button key={item.id} onClick={() => handleSelectItem(item)} className={`relative aspect-square rounded-lg border-2 ${selectedItem?.id === item.id ? 'border-sky-400' : 'border-transparent'}`}>
                  <div className="absolute inset-0 bg-slate-700/50 rounded-md p-1">
                    <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || ''} />
                    {item.quantity > 1 && <span className="absolute bottom-0 right-1 text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>x{item.quantity}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {selectedItem && (
            <div className="mt-auto pt-4 border-t border-gray-700">
              <h4 className="font-semibold mb-2 text-gray-300">2. Définissez un prix</h4>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="Prix en crédits" value={price} onChange={e => setPrice(e.target.value)} className="bg-white/5 border-white/20" />
                <Button onClick={handleListForSale} disabled={loading || !price}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vendre"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right side: My listings */}
      <Card className="bg-gray-800/50 border-gray-700 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Mes Annonces ({myListings.length}/{gameState.sale_slots})</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> :
            myListings.length > 0 ? (
              <div className="space-y-3">
                {myListings.map(listing => (
                  <div key={listing.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                    <div className="w-12 h-12 bg-slate-700/50 rounded-md p-1 flex-shrink-0 relative">
                      <ItemIcon iconName={listing.items.signedIconUrl || listing.items.icon} alt={listing.items.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{listing.items.name} (x{listing.quantity})</p>
                      <p className="text-sm text-yellow-400 flex items-center gap-1"><Coins size={14} /> {listing.price}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleCancelListing(listing.id, 'buy_back', listing.price)} className="bg-transparent border-sky-500/50 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300"><Undo2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCancelListing(listing.id, 'discard', listing.price)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-center">Vous n'avez aucun objet en vente.</p>
          }
        </CardContent>
      </Card>
      <ActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.title}
        description={actionModal.description}
        actions={[
          { label: actionModal.confirmLabel, onClick: actionModal.onConfirm, variant: actionModal.confirmVariant },
          { label: "Annuler", onClick: () => setActionModal({ ...actionModal, isOpen: false }), variant: "secondary" },
        ]}
      />
    </div>
  );
};

export default MarketSellTab;