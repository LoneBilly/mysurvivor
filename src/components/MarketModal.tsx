import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase';
import SellItemDialog from './SellItemDialog';
import { X, ShoppingCart, Tag, List } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Types
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

interface PlayerSaleListing extends MarketListing {}

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerInventory: InventoryItem[];
  marketListings: MarketListing[];
  onSuccessfulAction: () => void;
  playerSaleListings: PlayerSaleListing[];
}

const MarketModal = ({ 
  isOpen, 
  onClose, 
  playerInventory, 
  marketListings, 
  onSuccessfulAction,
  playerSaleListings
}: MarketModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [selectedItemToSell, setSelectedItemToSell] = useState<InventoryItem | null>(null);

  const filteredListings = useMemo(() => {
    if (!marketListings) return [];
    return marketListings.filter(listing =>
      listing.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [marketListings, searchTerm]);

  const handleSellClick = (item: InventoryItem) => {
    setSelectedItemToSell(item);
    setIsSellDialogOpen(true);
  };

  const handleConfirmSell = async (price: number, quantity: number) => {
    if (!selectedItemToSell) return;
    
    try {
      const { error } = await supabase.rpc('list_item_for_sale', {
        p_inventory_id: selectedItemToSell.id,
        p_price: price,
        p_quantity_to_sell: quantity
      });

      if (error) throw error;

      toast.success("Objet mis en vente avec succès !");
      onSuccessfulAction();
    } catch (error: any) {
      console.error("Error listing item:", error);
      toast.error(error.message || "Une erreur est survenue lors de la mise en vente.");
    } finally {
      setIsSellDialogOpen(false);
      setSelectedItemToSell(null);
    }
  };

  const handleBuyItem = async (listing: MarketListing) => {
    try {
      const { error } = await supabase.rpc('buy_market_item', { p_listing_id: listing.listing_id });
      if (error) throw error;
      toast.success(`Vous avez acheté ${listing.quantity}x ${listing.item_name} !`);
      onSuccessfulAction();
    } catch (error: any) {
      console.error("Error buying item:", error);
      toast.error(error.message || "Une erreur est survenue lors de l'achat.");
    }
  };

  const handleCancelListing = async (listingId: number, action: 'discard' | 'buy_back') => {
    try {
      const { error } = await supabase.rpc('cancel_listing', { p_listing_id: listingId, p_action: action });
      if (error) throw error;
      toast.success("Annonce retirée avec succès.");
      onSuccessfulAction();
    } catch (error: any) {
      console.error("Error cancelling listing:", error);
      toast.error(error.message || "Une erreur est survenue lors de l'annulation.");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl">Marché</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="buy" className="flex-grow flex flex-col">
            <TabsList className="flex-shrink-0 bg-gray-800 border-gray-700">
              <TabsTrigger value="buy" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"><ShoppingCart className="w-4 h-4 mr-2" />Acheter</TabsTrigger>
              <TabsTrigger value="sell" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"><Tag className="w-4 h-4 mr-2" />Vendre</TabsTrigger>
              <TabsTrigger value="listings" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"><List className="w-4 h-4 mr-2" />Mes annonces</TabsTrigger>
            </TabsList>
            
            <TabsContent value="buy" className="mt-4 flex-grow flex flex-col min-h-0">
              <div className="flex flex-row gap-2 mb-4 flex-shrink-0">
                <Input 
                  placeholder="Rechercher un objet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <ScrollArea className="flex-grow">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-gray-700">
                      <TableHead className="text-white">Objet</TableHead>
                      <TableHead className="text-white">Vendeur</TableHead>
                      <TableHead className="text-right text-white">Prix</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListings.map((listing) => (
                      <TableRow key={listing.listing_id} className="border-b-gray-800">
                        <TableCell className="font-medium flex items-center">
                          <img src={listing.item_icon} alt={listing.item_name} className="w-10 h-10 mr-4 p-1 bg-gray-700 rounded-md" />
                          <div>
                            <div>{listing.item_name} (x{listing.quantity})</div>
                            <div className="text-xs text-gray-400">Vendu par {listing.seller_username}</div>
                          </div>
                        </TableCell>
                        <TableCell>{listing.seller_username}</TableCell>
                        <TableCell className="text-right font-mono">{listing.price} C</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleBuyItem(listing)}>Acheter</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sell" className="mt-4 flex-grow flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Votre inventaire</h3>
              </div>
              <ScrollArea className="flex-grow bg-gray-800/50 rounded-lg p-2">
                <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {playerInventory && playerInventory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-900/80 border border-gray-700 rounded-md p-2 flex flex-col items-center justify-center text-center relative cursor-pointer hover:bg-gray-700 transition-colors aspect-square"
                      onClick={() => handleSellClick(item)}
                    >
                      <img src={item.items.icon} alt={item.items.name} className="w-10 h-10 mb-1" />
                      <span className="text-xs leading-tight line-clamp-2">{item.items.name}</span>
                      <span className="absolute top-1 right-1 text-xs font-bold bg-gray-800 px-1.5 py-0.5 rounded-full">{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="listings" className="mt-4 flex-grow flex flex-col min-h-0">
              <ScrollArea className="flex-grow">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-gray-700">
                      <TableHead className="text-white">Objet</TableHead>
                      <TableHead className="text-right text-white">Prix</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerSaleListings.map((listing) => (
                      <TableRow key={listing.listing_id} className="border-b-gray-800">
                        <TableCell className="font-medium flex items-center">
                          <img src={listing.item_icon} alt={listing.item_name} className="w-10 h-10 mr-4 p-1 bg-gray-700 rounded-md" />
                          <div>
                            <div>{listing.item_name} (x{listing.quantity})</div>
                            <div className="text-xs text-gray-400">En vente depuis le {new Date(listing.created_at).toLocaleDateString()}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{listing.price} C</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive"><X className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 text-white border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Retirer l'annonce</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Vous pouvez soit jeter l'objet (il sera perdu), soit le racheter pour 40% de son prix de vente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-600 hover:bg-gray-700">Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelListing(listing.listing_id, 'discard')} className="bg-red-800 hover:bg-red-700">Jeter l'objet</AlertDialogAction>
                                <AlertDialogAction onClick={() => handleCancelListing(listing.listing_id, 'buy_back')}>Racheter ({Math.floor(listing.price * 0.4)} C)</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {selectedItemToSell && (
        <SellItemDialog
          isOpen={isSellDialogOpen}
          onClose={() => setIsSellDialogOpen(false)}
          item={selectedItemToSell}
          onConfirm={handleConfirmSell}
        />
      )}
    </>
  );
};

export default MarketModal;