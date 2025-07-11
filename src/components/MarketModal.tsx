import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store } from "lucide-react";

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MarketModal = ({ isOpen, onClose }: MarketModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl p-6 flex flex-col">
        <DialogHeader className="text-center">
          <Store className="w-8 h-8 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-2xl">
            Marché
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Achetez et vendez des objets avec d'autres survivants.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="buy" className="w-full flex flex-col flex-1 min-h-0 mt-4">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="buy">Acheter</TabsTrigger>
            <TabsTrigger value="sell">Vendre</TabsTrigger>
            <TabsTrigger value="listings">Mes Ventes</TabsTrigger>
          </TabsList>
          <TabsContent value="buy" className="flex-1 min-h-0 mt-4">
            <div className="bg-black/20 h-full rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Section Achat - Bientôt disponible</p>
            </div>
          </TabsContent>
          <TabsContent value="sell" className="flex-1 min-h-0 mt-4">
            <div className="bg-black/20 h-full rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Section Vente - Bientôt disponible</p>
            </div>
          </TabsContent>
          <TabsContent value="listings" className="flex-1 min-h-0 mt-4">
            <div className="bg-black/20 h-full rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Section Mes Ventes - Bientôt disponible</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MarketModal;