import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ShoppingCart, Tag } from "lucide-react";
import { GameState } from "@/types/game";
import MarketSellTab from "./MarketSellTab";
import MarketBuyTab from "./MarketBuyTab";

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onRefresh: () => void;
}

const MarketModal = ({ isOpen, onClose, gameState, onRefresh }: MarketModalProps) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl p-4 sm:p-6 flex flex-col">
        <DialogHeader className="text-center">
          <Store className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-2xl">
            Marché
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Achetez et vendez des objets avec d'autres survivants.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="sell" className="w-full flex-1 flex flex-col min-h-0 mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy"><ShoppingCart className="w-4 h-4 mr-2" />Acheter</TabsTrigger>
            <TabsTrigger value="sell"><Tag className="w-4 h-4 mr-2" />Vendre</TabsTrigger>
          </TabsList>
          <TabsContent value="buy" className="flex-1 min-h-0 mt-4">
            <MarketBuyTab />
          </TabsContent>
          <TabsContent value="sell" className="flex-1 min-h-0 mt-4">
            <MarketSellTab gameState={gameState} onRefresh={onRefresh} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MarketModal;