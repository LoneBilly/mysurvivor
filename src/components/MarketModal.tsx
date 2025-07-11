"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/src/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Coins, XCircle, ShoppingCart, Tag } from "lucide-react";

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MarketListing {
  listing_id: number;
  seller_id: string;
  seller_username: string;
  item_id: number;
  item_name: string;
  item_icon: string;
  quantity: number;
  price: number;
  created_at: string;
}

interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: {
    name: string;
    description: string;
    icon: string;
    use_action_text: string;
    type: string;
  };
}

const MarketModal: React.FC<MarketModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [listingPrice, setListingPrice] = useState<string>("");
  const [listingQuantity, setListingQuantity] = useState<string>("");

  const { data: listings, isLoading: isLoadingListings, error: listingsError } = useQuery<MarketListing[]>({
    queryKey: ["marketListings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_market_listings");
      if (error) throw error;
      return data;
    },
  });

  const { data: inventory, isLoading: isLoadingInventory, error: inventoryError } = useQuery<InventoryItem[]>({
    queryKey: ["playerInventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventories").select(`
        id,
        item_id,
        quantity,
        slot_position,
        items (
          name,
          description,
          icon,
          use_action_text,
          type
        )
      `).eq("player_id", (await supabase.auth.getUser()).data.user?.id);
      if (error) throw error;
      return data;
    },
    enabled: activeTab === "sell",
  });

  const { data: playerState, isLoading: isLoadingPlayerState, error: playerStateError } = useQuery({
    queryKey: ["playerState"],
    queryFn: async () => {
      const { data, error } = await supabase.from("player_states").select("credits, sale_slots").single();
      if (error) throw error;
      return data;
    },
  });

  const buyItemMutation = useMutation({
    mutationFn: async (listingId: number) => {
      const { error } = await supabase.rpc("buy_market_item", { p_listing_id: listingId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objet acheté avec succès !");
      queryClient.invalidateQueries({ queryKey: ["marketListings"] });
      queryClient.invalidateQueries({ queryKey: ["playerInventory"] });
      queryClient.invalidateQueries({ queryKey: ["playerState"] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'achat: ${error.message}`);
    },
  });

  const listItemForSaleMutation = useMutation({
    mutationFn: async ({ inventoryId, price, quantity }: { inventoryId: number; price: number; quantity: number }) => {
      const { error } = await supabase.rpc("list_item_for_sale", {
        p_inventory_id: inventoryId,
        p_price: price,
        p_quantity_to_sell: quantity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objet mis en vente avec succès !");
      setSelectedInventoryItem(null);
      setListingPrice("");
      setListingQuantity("");
      queryClient.invalidateQueries({ queryKey: ["marketListings"] });
      queryClient.invalidateQueries({ queryKey: ["playerInventory"] });
      queryClient.invalidateQueries({ queryKey: ["playerState"] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise en vente: ${error.message}`);
    },
  });

  const cancelListingMutation = useMutation({
    mutationFn: async ({ listingId, action }: { listingId: number; action: "discard" | "buy_back" }) => {
      const { error } = await supabase.rpc("cancel_listing", { p_listing_id: listingId, p_action: action });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Annonce annulée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["marketListings"] });
      queryClient.invalidateQueries({ queryKey: ["playerInventory"] });
      queryClient.invalidateQueries({ queryKey: ["playerState"] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'annulation: ${error.message}`);
    },
  });

  const filteredListings = listings?.filter(listing =>
    listing.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.seller_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInventory = inventory?.filter(item =>
    item.items.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBuyItem = (listingId: number) => {
    buyItemMutation.mutate(listingId);
  };

  const handleListItemForSale = () => {
    if (!selectedInventoryItem || !listingPrice || !listingQuantity) {
      toast.error("Veuillez sélectionner un objet, un prix et une quantité.");
      return;
    }
    const price = parseInt(listingPrice);
    const quantity = parseInt(listingQuantity);

    if (isNaN(price) || price <= 0) {
      toast.error("Le prix doit être un nombre positif.");
      return;
    }
    if (isNaN(quantity) || quantity <= 0 || quantity > selectedInventoryItem.quantity) {
      toast.error("La quantité à vendre est invalide.");
      return;
    }

    listItemForSaleMutation.mutate({
      inventoryId: selectedInventoryItem.id,
      price,
      quantity,
    });
  };

  const handleCancelListing = (listingId: number, action: "discard" | "buy_back") => {
    cancelListingMutation.mutate({ listingId, action });
  };

  const myActiveListings = listings?.filter(listing => listing.seller_id === (supabase.auth.getUser() as any).data.user?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center text-yellow-400">Marché</DialogTitle>
          <DialogDescription className="text-center text-gray-300">
            Achetez et vendez des objets avec d'autres joueurs.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow">
          <TabsList className="grid w-full grid-cols-2 bg-gray-700">
            <TabsTrigger value="buy" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">Acheter</TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">Vendre</TabsTrigger>
          </TabsList>

          <TabsContent value="sell" className="mt-4 flex-grow flex flex-col min-h-0">
            <div className="flex flex-row gap-2 mb-4 flex-shrink-0">
              <Input
                placeholder="Rechercher un objet dans votre inventaire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            <h3 className="text-xl font-semibold mb-2 text-yellow-300">Votre Inventaire</h3>
            {isLoadingInventory ? (
              <div className="text-center text-gray-400">Chargement de l'inventaire...</div>
            ) : inventoryError ? (
              <div className="text-center text-red-400">Erreur de chargement de l'inventaire: {inventoryError.message}</div>
            ) : (
              <ScrollArea className="flex-grow border border-gray-600 rounded-md p-2 mb-4 min-h-[150px] max-h-[30vh]">
                {filteredInventory && filteredInventory.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {filteredInventory.map((item) => (
                      <div
                        key={item.id}
                        className={`p-2 border rounded-md flex flex-col items-center cursor-pointer transition-all duration-200
                          ${selectedInventoryItem?.id === item.id ? 'border-yellow-400 bg-yellow-900/30' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                        onClick={() => setSelectedInventoryItem(item)}
                      >
                        <img src={item.items.icon || '/placeholder-item.png'} alt={item.items.name} className="w-10 h-10 mb-1" />
                        <span className="text-sm font-medium text-white text-center">{item.items.name}</span>
                        <span className="text-xs text-gray-400">Qté: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">Votre inventaire est vide ou aucun objet ne correspond à votre recherche.</p>
                )}
              </ScrollArea>
            )}

            {selectedInventoryItem && (
              <div className="bg-gray-800 p-4 rounded-md mb-4 flex-shrink-0">
                <h4 className="text-lg font-semibold text-yellow-300 mb-2">Mettre en vente : {selectedInventoryItem.items.name}</h4>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <Input
                    type="number"
                    placeholder="Prix de vente (crédits)"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    className="flex-grow bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                  <Input
                    type="number"
                    placeholder={`Quantité (Max: ${selectedInventoryItem.quantity})`}
                    value={listingQuantity}
                    onChange={(e) => setListingQuantity(e.target.value)}
                    className="flex-grow bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    max={selectedInventoryItem.quantity}
                  />
                </div>
                <Button
                  onClick={handleListItemForSale}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={listItemForSaleMutation.isPending}
                >
                  {listItemForSaleMutation.isPending ? "Mise en vente..." : "Mettre en vente"}
                </Button>
              </div>
            )}

            <h3 className="text-xl font-semibold mb-2 text-yellow-300">Vos Annonces Actives ({playerState?.sale_slots || 0} slots)</h3>
            {isLoadingListings || isLoadingPlayerState ? (
              <div className="text-center text-gray-400">Chargement de vos annonces...</div>
            ) : listingsError ? (
              <div className="text-center text-red-400">Erreur de chargement de vos annonces: {listingsError.message}</div>
            ) : (
              <ScrollArea className="flex-grow border border-gray-600 rounded-md p-2 min-h-[100px]">
                {myActiveListings && myActiveListings.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {myActiveListings.map((listing) => (
                      <div key={listing.listing_id} className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-md">
                        <div className="flex items-center gap-3">
                          <img src={listing.item_icon || '/placeholder-item.png'} alt={listing.item_name} className="w-8 h-8" />
                          <div>
                            <p className="font-medium text-white">{listing.item_name} (x{listing.quantity})</p>
                            <p className="text-sm text-gray-400 flex items-center"><Coins className="w-4 h-4 mr-1 text-yellow-400" /> {listing.price} crédits</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelListing(listing.listing_id, "discard")}
                            disabled={cancelListingMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Jeter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelListing(listing.listing_id, "buy_back")}
                            disabled={cancelListingMutation.isPending}
                            className="border-yellow-500 text-yellow-500 hover:bg-yellow-900"
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" /> Racheter ({Math.floor(listing.price * 0.4)} crédits)
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">Vous n'avez aucune annonce active.</p>
                )}
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MarketModal;