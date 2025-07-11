import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Coins } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import ItemIcon from './ItemIcon';
import ActionModal from './ActionModal';
import { useDebounce } from '@/hooks/useDebounce';
import { getCachedSignedUrl } from '@/utils/iconCache';

interface MarketBuyListing {
  listing_id: number;
  seller_username: string;
  item_name: string;
  item_icon: string | null;
  quantity: number;
  price: number;
}

interface MarketBuyTabProps {
  onAction: () => Promise<void>;
}

const MarketBuyTab = ({ onAction }: MarketBuyTabProps) => {
  const [listings, setListings] = useState<MarketBuyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [itemToBuy, setItemToBuy] = useState<MarketBuyListing | null>(null);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_market_listings');
      if (error) {
        showError("Impossible de charger les objets du marché.");
        console.error(error);
        setListings([]);
      } else {
        const listingsWithUrls = await Promise.all(
          (data as MarketBuyListing[]).map(async (listing) => {
            if (listing.item_icon && listing.item_icon.includes('.')) {
              const signedUrl = await getCachedSignedUrl(listing.item_icon);
              return { ...listing, item_icon: signedUrl };
            }
            return listing;
          })
        );
        setListings(listingsWithUrls);
      }
      setLoading(false);
    };
    fetchListings();
  }, []);

  const handleBuyItem = async () => {
    if (!itemToBuy) return;
    
    const { error } = await supabase.rpc('buy_market_item', {
      p_listing_id: itemToBuy.listing_id,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Vous avez acheté ${itemToBuy.item_name} !`);
      await onAction();
      const { data, error: refetchError } = await supabase.rpc('get_market_listings');
      if (!refetchError) {
        const listingsWithUrls = await Promise.all(
          (data as MarketBuyListing[]).map(async (listing) => {
            if (listing.item_icon && listing.item_icon.includes('.')) {
              const signedUrl = await getCachedSignedUrl(listing.item_icon);
              return { ...listing, item_icon: signedUrl };
            }
            return listing;
          })
        );
        setListings(listingsWithUrls);
      }
    }
    setItemToBuy(null);
  };

  const filteredListings = useMemo(() => {
    return listings.filter(listing =>
      listing.item_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (listing.seller_username && listing.seller_username.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [listings, debouncedSearchTerm]);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un objet ou un vendeur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border-slate-700 pl-10"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 bg-slate-900/50 rounded-lg border border-slate-700 p-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredListings.length > 0 ? (
            filteredListings.map(listing => (
              <div key={listing.listing_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-800/60 rounded-md gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-black/20 rounded-md flex-shrink-0 relative p-1">
                    <ItemIcon iconName={listing.item_icon} alt={listing.item_name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{listing.item_name} (x{listing.quantity})</p>
                    <p className="text-sm text-slate-400 truncate">Vendu par: {listing.seller_username || 'Inconnu'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end w-full sm:w-auto gap-3">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold">
                    <Coins size={16} />
                    <span>{listing.price}</span>
                  </div>
                  <Button size="sm" onClick={() => setItemToBuy(listing)}>Acheter</Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-center p-8">Aucun objet à vendre pour le moment.</p>
          )}
        </div>
      </div>
      <ActionModal
        isOpen={!!itemToBuy}
        onClose={() => setItemToBuy(null)}
        title={`Acheter ${itemToBuy?.item_name}`}
        description={`Voulez-vous acheter cet objet pour ${itemToBuy?.price} crédits ?`}
        actions={[
          { label: "Confirmer l'achat", onClick: handleBuyItem, variant: "default" },
          { label: "Annuler", onClick: () => setItemToBuy(null), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default MarketBuyTab;