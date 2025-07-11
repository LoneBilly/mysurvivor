"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { MarketListing, InventoryItem } from "@/types";
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function MarketModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { playerState, inventory, fetchPlayerData } = useGame();
  const { toast } = useToast();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [price, setPrice] = useState<string>("");
  const [quantityToSell, setQuantityToSell] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      fetchListings();
    }
  }, [isOpen]);

  const fetchListings = async () => {
    const { data, error } = await supabase.rpc('get_market_listings');
    if (error) {
      console.error("Error fetching market listings:", error);
      toast({ title: "Erreur", description: "Impossible de charger les offres du marché.", variant: "destructive" });
    } else {
      setListings(data || []);
    }
  };

  const handleBuy = async (listingId: number) => {
    const { error } = await supabase.rpc('buy_market_item', { p_listing_id: listingId });
    if (error) {
      toast({ title: "Achat échoué", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Achat réussi!", description: "L'objet a été ajouté à votre inventaire." });
      fetchListings();
      fetchPlayerData();
    }
  };

  const handleSell = async () => {
    if (!selectedItem || !price || !quantityToSell) return;

    const priceInt = parseInt(price, 10);
    const quantityInt = parseInt(quantityToSell, 10);

    if (isNaN(priceInt) || priceInt <= 0 || isNaN(quantityInt) || quantityInt <= 0) {
      toast({ title: "Erreur", description: "Veuillez entrer un prix et une quantité valides.", variant: "destructive" });
      return;
    }
    
    if (quantityInt > selectedItem.quantity) {
      toast({ title: "Erreur", description: "Vous n'avez pas assez de cet objet.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.rpc('list_item_for_sale', {
      p_inventory_id: selectedItem.id,
      p_price: priceInt,
      p_quantity_to_sell: quantityInt
    });

    if (error) {
      toast({ title: "Mise en vente échouée", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Objet mis en vente!", description: "Votre objet est maintenant sur le marché." });
      setSelectedItem(null);
      setPrice("");
      setQuantityToSell("");
      fetchPlayerData();
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(listing =>
      listing.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [listings, searchTerm]);

  const usedSaleSlots = useMemo(() => {
    return listings.filter(l => l.seller_id === playerState?.id).length;
  }, [listings, playerState]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Marché</DialogTitle>
          <DialogDescription>Achetez et vendez des objets avec d'autres survivants.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="buy" className="flex-grow flex flex-col">
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
              />
            </div>
            <ScrollArea className="flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                {filteredListings.map((listing) => (
                  <div key={listing.listing_id} className="border rounded-lg p-4 flex flex-col justify-between">
                    <div className="flex items-center mb-2">
                      <Image src={`/icons/${listing.item_icon}`} alt={listing.item_name} width={40} height={40} className="mr-4" />
                      <div>
                        <h3 className="font-bold">{listing.item_name} (x{listing.quantity})</h3>
                        <p className="text-sm text-muted-foreground">Vendu par: {listing.seller_username}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-bold text-lg text-green-500">{listing.price} C</span>
                      <Button onClick={() => handleBuy(listing.listing_id)}>Acheter</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="sell" className="mt-4 flex-grow flex flex-col min-h-0">
            <div className="grid grid-cols-2 gap-8 h-full">
              <div className="flex flex-col">
                <h3 className="font-bold mb-2">Votre inventaire</h3>
                <Alert className="mb-2">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Info</AlertTitle>
                  <AlertDescription>
                    Emplacements de vente: {usedSaleSlots} / {playerState?.sale_slots || 0}
                  </AlertDescription>
                </Alert>
                <ScrollArea className="border rounded-lg p-2 flex-grow">
                  <div className="grid grid-cols-4 gap-2">
                    {inventory.map((item) => (
                      <div
                        key={item.id}
                        className={`relative aspect-square border rounded-md flex items-center justify-center cursor-pointer ${selectedItem?.id === item.id ? 'border-primary ring-2 ring-primary' : 'border-gray-700'}`}
                        onClick={() => {
                          setSelectedItem(item);
                          setQuantityToSell(item.quantity.toString());
                        }}
                      >
                        <Image src={`/icons/${item.items.icon}`} alt={item.items.name} width={48} height={48} />
                        {item.quantity > 1 && (
                          <div className="absolute bottom-0 right-1 text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                            x{item.quantity}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex flex-col justify-center items-center border rounded-lg p-4 bg-slate-900/50">
                {selectedItem ? (
                  <div className="w-full">
                    <h3 className="font-bold text-lg text-center mb-4">Vendre {selectedItem.items.name}</h3>
                    <div className="flex justify-center mb-4">
                      <Image src={`/icons/${selectedItem.items.icon}`} alt={selectedItem.items.name} width={64} height={64} />
                    </div>
                    <div className="space-y-4">
                       <Input
                        type="number"
                        placeholder={`Quantité (max: ${selectedItem.quantity})`}
                        value={quantityToSell}
                        onChange={(e) => setQuantityToSell(e.target.value)}
                        min="1"
                        max={selectedItem.quantity}
                      />
                      <Input
                        type="number"
                        placeholder="Prix de vente"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                      <Button onClick={handleSell} className="w-full">Mettre en vente</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sélectionnez un objet à vendre.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}