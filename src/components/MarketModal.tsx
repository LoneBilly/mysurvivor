"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { usePlayer } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Types
interface MarketListing {
  listing_id: number;
  seller_username: string;
  item_name: string;
  item_icon: string;
  quantity: number;
  price: number;
}

interface InventoryItem {
  id: number;
  items: {
    name: string;
    icon: string;
  };
  quantity: number;
}

interface PlayerListing {
  id: number;
  items: {
    name: string;
    icon: string;
  };
  quantity: number;
  price: number;
}

export function MarketModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("buy");
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [myListings, setMyListings] = useState<PlayerListing[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { player, refreshPlayerData } = usePlayer();

  const fetchData = async () => {
    if (!isOpen || !player) return;

    setLoading(true);
    if (activeTab === "buy") {
      const { data, error } = await supabase.rpc("get_market_listings");
      if (error) {
        toast({ title: "Erreur", description: "Impossible de charger le marché.", variant: "destructive" });
      } else {
        setListings(data || []);
      }
    } else {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventories")
        .select(`id, quantity, items (name, icon)`)
        .eq("player_id", player.id);
      if (inventoryError) {
        toast({ title: "Erreur", description: "Impossible de charger l'inventaire.", variant: "destructive" });
      } else {
        setInventory(inventoryData || []);
      }

      const { data: listingsData, error: listingsError } = await supabase
        .from("market_listings")
        .select(`id, quantity, price, items (name, icon)`)
        .eq("seller_id", player.id);
      if (listingsError) {
        toast({ title: "Erreur", description: "Impossible de charger vos ventes.", variant: "destructive" });
      } else {
        setMyListings(listingsData || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [isOpen, activeTab, player]);

  const handleBuyItem = async (listing: MarketListing) => {
    if (!player || player.credits < listing.price) {
        toast({ title: "Crédits insuffisants", variant: "destructive" });
        return;
    }
    const { error } = await supabase.rpc('buy_market_item', { p_listing_id: listing.listing_id });
    if (error) {
        toast({ title: "Erreur d'achat", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Achat réussi!" });
        fetchData();
        refreshPlayerData();
    }
  };

  const handleSellItem = (item: InventoryItem) => {
    toast({ title: "Fonctionnalité à venir", description: "La mise en vente d'objets sera bientôt disponible." });
  };

  const handleCancelListing = async (listingId: number) => {
     // Placeholder
  };

  const filteredListings = useMemo(() => {
    return listings.filter((listing) =>
      listing.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [listings, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ShoppingCart className="mr-2 h-4 w-4" /> Marché
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Marché</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Acheter</TabsTrigger>
            <TabsTrigger value="sell">Vendre</TabsTrigger>
          </TabsList>
          
          <TabsContent value="buy" className="mt-4 flex-grow flex flex-col min-h-0">
            <div className="flex flex-row gap-2 mb-4 flex-shrink-0">
              <Input
                placeholder="Rechercher un objet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </div>
            <ScrollArea className="flex-grow pr-4">
              {loading && <p className="text-center py-4">Chargement du marché...</p>}
              {!loading && filteredListings.length === 0 && <p className="text-center text-muted-foreground py-8">Le marché est vide.</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((listing) => (
                  <div key={listing.listing_id} className="border rounded-lg p-3 flex flex-col text-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <img src={listing.item_icon} alt={listing.item_name} className="w-10 h-10 object-contain" />
                      <div className="flex-grow">
                        <p className="font-bold">{listing.item_name} <span className="font-normal text-muted-foreground">x{listing.quantity}</span></p>
                        <p className="text-xs text-muted-foreground">Vendeur: {listing.seller_username}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t">
                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <Coins size={16} /> {listing.price}
                      </div>
                      <Button size="sm" onClick={() => handleBuyItem(listing)} disabled={loading || (player && player.credits < listing.price)}>Acheter</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sell" className="mt-4 flex-grow flex flex-col min-h-0">
            <div className="grid md:grid-cols-2 gap-6 flex-grow min-h-0">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Mon Inventaire</h3>
                <ScrollArea className="border rounded-lg p-2 flex-grow">
                  {loading && <p className="text-center py-4">Chargement...</p>}
                  {!loading && inventory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Votre inventaire est vide.</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {inventory.map((item) => (
                      <Button variant="outline" key={item.id} className="h-auto p-2 flex flex-col items-center text-center" onClick={() => handleSellItem(item)}>
                        <img src={item.items.icon} alt={item.items.name} className="w-12 h-12 object-contain" />
                        <span className="text-xs mt-1">{item.items.name}</span>
                        <span className="text-xs font-bold">x{item.quantity}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Mes Objets en Vente</h3>
                <ScrollArea className="border rounded-lg p-2 flex-grow">
                  {loading && <p className="text-center py-4">Chargement...</p>}
                  {!loading && myListings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Vous n'avez aucun objet en vente.</p>}
                  <div className="space-y-2">
                    {myListings.map((listing) => (
                      <div key={listing.id} className="border p-2 rounded-md flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <img src={listing.items.icon} alt={listing.items.name} className="w-8 h-8 object-contain" />
                          <div>
                            <p>{listing.items.name} x{listing.quantity}</p>
                            <p className="text-xs text-amber-500 flex items-center gap-1"><Coins size={12}/> {listing.price}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleCancelListing(listing.id)} disabled={loading}><Trash2 size={16}/></Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}